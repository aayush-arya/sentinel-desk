import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  CommentVisibility,
  Prisma,
  TicketHistoryAction,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SlaService } from '../sla/sla.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { sanitizeRichText } from '../common/utils/sanitize-html.util';
import { AI_ENRICHMENT_QUEUE } from '../ai/ai.constants';
import type { AiEnrichmentJobData } from '../ai/ai-enrichment.processor';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { isStaff } from './types/authenticated-request.type';
import type { CreateTicketDto } from './dto/create-ticket.dto';
import type { UpdateTicketDto } from './dto/update-ticket.dto';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { AssignTicketDto } from './dto/assign-ticket.dto';
import type { EscalateTicketDto } from './dto/escalate-ticket.dto';
import type { RateCsatDto } from './dto/rate-csat.dto';
import type { MergeTicketDto } from './dto/merge-ticket.dto';
import type { SplitTicketDto } from './dto/split-ticket.dto';
import type { QueryTicketsDto } from './dto/query-tickets.dto';

const TICKET_LIST_INCLUDE = {
  requester: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  tags: { include: { tag: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketInclude;

const TICKET_DETAIL_INCLUDE = {
  ...TICKET_LIST_INCLUDE,
  comments: {
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, roleId: true } },
      attachments: true,
    },
  },
  mergedInto: { select: { id: true, number: true, subject: true } },
  splitFrom: { select: { id: true, number: true, subject: true } },
} satisfies Prisma.TicketInclude;

type TicketWithDetail = Prisma.TicketGetPayload<{ include: typeof TICKET_DETAIL_INCLUDE }>;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly sla: SlaService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
    @InjectQueue(AI_ENRICHMENT_QUEUE) private readonly aiQueue: Queue<AiEnrichmentJobData>,
  ) {}

  /** Tells anyone viewing this ticket, plus the org's list/dashboard views, to refresh. */
  private broadcastTicketChanged(organizationId: string, ticketId: string) {
    this.realtime.emitToTicket(ticketId, 'ticket:updated', { ticketId });
    this.realtime.emitToOrg(organizationId, 'ticket:updated', { ticketId });
  }

  async create(user: AuthenticatedUser, dto: CreateTicketDto, files: Express.Multer.File[] = []) {
    let requesterId = user.id;
    if (dto.requesterId) {
      if (!isStaff(user)) {
        throw new ForbiddenException('Customers cannot file tickets on behalf of others');
      }
      const requester = await this.prisma.user.findUnique({ where: { id: dto.requesterId } });
      if (!requester || requester.organizationId !== user.organizationId) {
        throw new BadRequestException('requesterId must be a member of your organization');
      }
      requesterId = dto.requesterId;
    }

    const priority = dto.priority ?? TicketPriority.MEDIUM;
    const dueDates = await this.sla.computeDueDatesForNewTicket(user.organizationId, priority);

    const ticket = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: user.organizationId },
        data: { nextTicketNumber: { increment: 1 } },
      });
      const number = org.nextTicketNumber - 1;

      const created = await tx.ticket.create({
        data: {
          organizationId: user.organizationId,
          number,
          subject: dto.subject,
          priority,
          requesterId,
          slaPolicyId: dueDates.slaPolicyId,
          responseDueAt: dueDates.responseDueAt,
          resolutionDueAt: dueDates.resolutionDueAt,
          tags: dto.tagIds?.length
            ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        },
      });

      const comment = await tx.comment.create({
        data: {
          ticketId: created.id,
          authorId: user.id,
          visibility: CommentVisibility.PUBLIC,
          body: sanitizeRichText(dto.body),
        },
      });

      await tx.ticketHistory.create({
        data: { ticketId: created.id, actorId: user.id, action: TicketHistoryAction.CREATED },
      });

      return { created, comment };
    });

    if (files.length) {
      await this.saveAttachments(ticket.comment.id, files);
    }

    this.realtime.emitToOrg(user.organizationId, 'ticket:created', { ticketId: ticket.created.id });
    await this.aiQueue.add('ticket-created', { kind: 'ticket-created', ticketId: ticket.created.id });

    return this.findOne(user, ticket.created.id);
  }

  async findAll(user: AuthenticatedUser, query: QueryTicketsDto) {
    const where: Prisma.TicketWhereInput = { organizationId: user.organizationId };

    if (!isStaff(user)) {
      where.requesterId = user.id;
    }
    if (query.status?.length) where.status = { in: query.status };
    if (query.priority?.length) where.priority = { in: query.priority };
    if (query.tagId) where.tags = { some: { tagId: query.tagId } };
    if (query.assignee === 'me') where.assigneeId = user.id;
    else if (query.assignee === 'unassigned') where.assigneeId = null;
    else if (query.assignee) where.assigneeId = query.assignee;
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { comments: { some: { body: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const orderBy = { [query.sortBy ?? 'updatedAt']: query.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: TICKET_LIST_INCLUDE,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: items.map((t) => this.toTicketSummary(t, isStaff(user))),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async findOne(user: AuthenticatedUser, ticketId: string) {
    const ticket = await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);
    return this.toTicketDetail(ticket, user);
  }

  async update(user: AuthenticatedUser, ticketId: string, dto: UpdateTicketDto) {
    const ticket = await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);

    if (!isStaff(user)) {
      if (dto.priority || dto.status) {
        throw new ForbiddenException('Only staff can change priority or status');
      }
      if (ticket.status !== TicketStatus.OPEN && ticket.status !== TicketStatus.PENDING) {
        throw new ForbiddenException('This ticket can no longer be edited');
      }
    }
    const data: Prisma.TicketUpdateInput = {};
    const historyEntries: Prisma.TicketHistoryCreateManyInput[] = [];

    if (dto.subject && dto.subject !== ticket.subject) {
      data.subject = dto.subject;
    }
    if (dto.priority && dto.priority !== ticket.priority) {
      data.priority = dto.priority;
      const dueDates = await this.sla.recomputeDueDatesForPriorityChange(ticketId, dto.priority);
      if (dueDates.responseDueAt) data.responseDueAt = dueDates.responseDueAt;
      if (dueDates.resolutionDueAt) data.resolutionDueAt = dueDates.resolutionDueAt;
      historyEntries.push({
        ticketId,
        actorId: user.id,
        action: TicketHistoryAction.PRIORITY_CHANGED,
        metadata: { from: ticket.priority, to: dto.priority },
      });
    }

    const PAUSING_STATUSES: TicketStatus[] = [TicketStatus.PENDING, TicketStatus.ON_HOLD];
    let slaTransition: 'pause' | 'resume' | null = null;
    if (dto.status && dto.status !== ticket.status) {
      data.status = dto.status;
      if (dto.status === TicketStatus.RESOLVED) data.resolvedAt = new Date();
      if (dto.status === TicketStatus.CLOSED) data.closedAt = new Date();
      if (!PAUSING_STATUSES.includes(ticket.status) && PAUSING_STATUSES.includes(dto.status)) {
        slaTransition = 'pause';
      } else if (PAUSING_STATUSES.includes(ticket.status) && dto.status === TicketStatus.OPEN) {
        slaTransition = 'resume';
      }
      historyEntries.push({
        ticketId,
        actorId: user.id,
        action: TicketHistoryAction.STATUS_CHANGED,
        metadata: { from: ticket.status, to: dto.status },
      });
    }

    await this.prisma.$transaction([
      this.prisma.ticket.update({ where: { id: ticketId }, data }),
      ...(historyEntries.length ? [this.prisma.ticketHistory.createMany({ data: historyEntries })] : []),
    ]);

    if (slaTransition === 'pause') await this.sla.pause(ticketId, user.id);
    else if (slaTransition === 'resume') await this.sla.resume(ticketId, user.id);

    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, ticketId);
  }

  async reopen(user: AuthenticatedUser, ticketId: string) {
    const ticket = await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);
    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      throw new BadRequestException('Only resolved or closed tickets can be reopened');
    }

    await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.OPEN,
          resolvedAt: null,
          closedAt: null,
          reopenedCount: { increment: 1 },
        },
      }),
      this.prisma.ticketHistory.create({
        data: { ticketId, actorId: user.id, action: TicketHistoryAction.REOPENED },
      }),
    ]);

    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, ticketId);
  }

  async rateCsat(user: AuthenticatedUser, ticketId: string, dto: RateCsatDto) {
    const ticket = await this.getTicketOrThrow(user, ticketId, TICKET_LIST_INCLUDE);
    // getTicketOrThrow already 404s a customer trying to reach someone else's ticket,
    // so the only remaining check is that staff can't rate on a customer's behalf.
    if (isStaff(user)) throw new ForbiddenException('Only the requester can rate a ticket');
    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      throw new BadRequestException('Ticket must be resolved or closed before it can be rated');
    }
    if (ticket.csatRatedAt) {
      throw new BadRequestException('This ticket has already been rated');
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { csatRating: dto.rating, csatComment: dto.comment, csatRatedAt: new Date() },
    });

    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, ticketId);
  }

  async addComment(
    user: AuthenticatedUser,
    ticketId: string,
    dto: CreateCommentDto,
    files: Express.Multer.File[] = [],
  ) {
    const ticket = await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);
    const staff = isStaff(user);

    const visibility = staff && dto.visibility ? dto.visibility : CommentVisibility.PUBLIC;
    if (!staff && dto.visibility === CommentVisibility.INTERNAL) {
      throw new ForbiddenException('Customers cannot create internal notes');
    }

    const wasClosed = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;
    const autoReopen = !staff && wasClosed && visibility === CommentVisibility.PUBLIC;

    const isFirstStaffReply =
      staff &&
      visibility === CommentVisibility.PUBLIC &&
      !ticket.firstResponseAt &&
      ticket.requesterId !== user.id;

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: { ticketId, authorId: user.id, visibility, body: sanitizeRichText(dto.body) },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          action: visibility === CommentVisibility.INTERNAL
            ? TicketHistoryAction.NOTE_ADDED
            : TicketHistoryAction.COMMENT_ADDED,
        },
      });

      const ticketData: Prisma.TicketUpdateInput = {};
      if (isFirstStaffReply) ticketData.firstResponseAt = new Date();
      if (autoReopen) {
        ticketData.status = TicketStatus.OPEN;
        ticketData.resolvedAt = null;
        ticketData.closedAt = null;
        ticketData.reopenedCount = { increment: 1 };
      }
      if (Object.keys(ticketData).length) {
        await tx.ticket.update({ where: { id: ticketId }, data: ticketData });
      }
      if (autoReopen) {
        await tx.ticketHistory.create({
          data: { ticketId, actorId: user.id, action: TicketHistoryAction.REOPENED },
        });
      }

      return created;
    });

    if (files.length) {
      await this.saveAttachments(comment.id, files);
    }

    if (visibility === CommentVisibility.PUBLIC) {
      // Safe to push the full comment: PUBLIC content is visible to everyone already in
      // this room. INTERNAL notes are never pushed this way — see broadcastTicketChanged
      // below, which only tells clients to refetch (and the REST layer filters visibility
      // correctly), rather than duplicating that filtering logic over the socket.
      const author = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, roleId: true },
      });
      this.realtime.emitToTicket(ticketId, 'ticket:comment:new', {
        ticketId,
        comment: { id: comment.id, body: comment.body, visibility, createdAt: comment.createdAt, author },
      });

      const recipientId = staff ? ticket.requesterId : ticket.assigneeId;
      if (recipientId && recipientId !== user.id) {
        await this.notifications.create({
          organizationId: user.organizationId,
          userId: recipientId,
          type: 'TICKET_REPLY',
          title: `New reply on ticket #${ticket.number}`,
          body: `${author.firstName} ${author.lastName} replied to "${ticket.subject}"`,
          ticketId,
        });
      }

      // Sentiment is only meaningful as a read on the customer, not on an agent's own tone.
      if (!staff) {
        await this.aiQueue.add('comment-sentiment', { kind: 'comment-sentiment', commentId: comment.id });
      }
    }
    this.broadcastTicketChanged(user.organizationId, ticketId);

    return this.findOne(user, ticketId);
  }

  async assign(user: AuthenticatedUser, ticketId: string, dto: AssignTicketDto) {
    const ticket = await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);

    const newAssignee = await this.prisma.user.findUnique({ where: { id: dto.assigneeId } });
    if (!newAssignee || newAssignee.organizationId !== user.organizationId) {
      throw new BadRequestException('assigneeId must be a member of your organization');
    }

    const action = ticket.assigneeId
      ? TicketHistoryAction.TRANSFERRED
      : TicketHistoryAction.ASSIGNED;

    await this.prisma.$transaction([
      this.prisma.ticket.update({ where: { id: ticketId }, data: { assigneeId: dto.assigneeId } }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          action,
          metadata: { from: ticket.assigneeId, to: dto.assigneeId },
        },
      }),
    ]);

    if (dto.assigneeId !== user.id) {
      await this.notifications.create({
        organizationId: user.organizationId,
        userId: dto.assigneeId,
        type: 'TICKET_ASSIGNED',
        title: `Ticket #${ticket.number} assigned to you`,
        body: ticket.subject,
        ticketId,
      });
    }
    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, ticketId);
  }

  async unassign(user: AuthenticatedUser, ticketId: string) {
    const ticket = await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);
    if (!ticket.assigneeId) return this.findOne(user, ticketId);

    await this.prisma.$transaction([
      this.prisma.ticket.update({ where: { id: ticketId }, data: { assigneeId: null } }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          action: TicketHistoryAction.UNASSIGNED,
          metadata: { from: ticket.assigneeId },
        },
      }),
    ]);
    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, ticketId);
  }

  async escalate(user: AuthenticatedUser, ticketId: string, dto: EscalateTicketDto) {
    const ticket = await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);

    if (dto.newAssigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.newAssigneeId } });
      if (!assignee || assignee.organizationId !== user.organizationId) {
        throw new BadRequestException('newAssigneeId must be a member of your organization');
      }
    }

    const data: Prisma.TicketUncheckedUpdateInput = { priority: dto.priority ?? 'URGENT' };
    if (dto.newAssigneeId) data.assigneeId = dto.newAssigneeId;

    await this.prisma.$transaction([
      this.prisma.ticket.update({ where: { id: ticketId }, data }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          action: TicketHistoryAction.ESCALATED,
          metadata: { reason: dto.reason, newAssigneeId: dto.newAssigneeId ?? null },
        },
      }),
    ]);

    const notifyId = dto.newAssigneeId ?? ticket.assigneeId;
    if (notifyId && notifyId !== user.id) {
      await this.notifications.create({
        organizationId: user.organizationId,
        userId: notifyId,
        type: 'TICKET_ASSIGNED',
        title: `Ticket #${ticket.number} escalated`,
        body: dto.reason,
        ticketId,
      });
    }
    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, ticketId);
  }

  async merge(user: AuthenticatedUser, ticketId: string, dto: MergeTicketDto) {
    if (ticketId === dto.intoTicketId) {
      throw new BadRequestException('A ticket cannot be merged into itself');
    }
    const [source, target] = await Promise.all([
      this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE),
      this.getTicketOrThrow(user, dto.intoTicketId, TICKET_DETAIL_INCLUDE),
    ]);
    if (source.mergedIntoId) {
      throw new BadRequestException('This ticket has already been merged');
    }

    await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { mergedIntoId: target.id, status: TicketStatus.CLOSED, closedAt: new Date() },
      }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          action: TicketHistoryAction.MERGED,
          metadata: { intoTicketId: target.id, intoTicketNumber: target.number },
        },
      }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId: target.id,
          actorId: user.id,
          action: TicketHistoryAction.MERGED_FROM,
          metadata: { fromTicketId: source.id, fromTicketNumber: source.number },
        },
      }),
    ]);

    this.broadcastTicketChanged(user.organizationId, ticketId);
    this.broadcastTicketChanged(user.organizationId, target.id);
    return this.findOne(user, ticketId);
  }

  async split(user: AuthenticatedUser, ticketId: string, dto: SplitTicketDto) {
    const source = await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);
    const commentsToCopy = source.comments.filter((c) => dto.commentIds.includes(c.id));
    if (commentsToCopy.length !== dto.commentIds.length) {
      throw new BadRequestException('One or more commentIds do not belong to this ticket');
    }

    const dueDates = await this.sla.computeDueDatesForNewTicket(user.organizationId, source.priority);

    const newTicketId = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: user.organizationId },
        data: { nextTicketNumber: { increment: 1 } },
      });
      const number = org.nextTicketNumber - 1;

      const newTicket = await tx.ticket.create({
        data: {
          organizationId: user.organizationId,
          number,
          subject: dto.subject,
          priority: source.priority,
          requesterId: source.requesterId,
          assigneeId: source.assigneeId,
          splitFromId: source.id,
          slaPolicyId: dueDates.slaPolicyId,
          responseDueAt: dueDates.responseDueAt,
          resolutionDueAt: dueDates.resolutionDueAt,
        },
      });

      for (const comment of commentsToCopy) {
        await tx.comment.create({
          data: {
            ticketId: newTicket.id,
            authorId: comment.authorId,
            visibility: comment.visibility,
            body: comment.body,
            createdAt: comment.createdAt,
          },
        });
      }

      await tx.ticketHistory.create({
        data: { ticketId: newTicket.id, actorId: user.id, action: TicketHistoryAction.CREATED },
      });
      await tx.ticketHistory.create({
        data: {
          ticketId: source.id,
          actorId: user.id,
          action: TicketHistoryAction.SPLIT,
          metadata: { newTicketId: newTicket.id, newTicketNumber: number },
        },
      });

      return newTicket.id;
    });

    this.realtime.emitToOrg(user.organizationId, 'ticket:created', { ticketId: newTicketId });
    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, newTicketId);
  }

  async addTag(user: AuthenticatedUser, ticketId: string, tagId: string) {
    await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.organizationId !== user.organizationId) {
      throw new BadRequestException('Unknown tag');
    }

    await this.prisma.$transaction([
      this.prisma.ticketTag.upsert({
        where: { ticketId_tagId: { ticketId, tagId } },
        update: {},
        create: { ticketId, tagId },
      }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          action: TicketHistoryAction.TAG_ADDED,
          metadata: { tagId, tagName: tag.name },
        },
      }),
    ]);
    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, ticketId);
  }

  async removeTag(user: AuthenticatedUser, ticketId: string, tagId: string) {
    await this.getTicketOrThrow(user, ticketId, TICKET_DETAIL_INCLUDE);
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });

    await this.prisma.$transaction([
      this.prisma.ticketTag.deleteMany({ where: { ticketId, tagId } }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          action: TicketHistoryAction.TAG_REMOVED,
          metadata: { tagId, tagName: tag?.name },
        },
      }),
    ]);
    this.broadcastTicketChanged(user.organizationId, ticketId);
    return this.findOne(user, ticketId);
  }

  async getHistory(user: AuthenticatedUser, ticketId: string) {
    await this.getTicketOrThrow(user, ticketId, TICKET_LIST_INCLUDE);
    const entries = await this.prisma.ticketHistory.findMany({
      where: { ticketId },
      include: { actor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return entries;
  }

  // ── internals ─────────────────────────────────────────────────────

  private async getTicketOrThrow<T extends Prisma.TicketInclude>(
    user: AuthenticatedUser,
    ticketId: string,
    include: T,
  ) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId }, include });
    if (!ticket || ticket.organizationId !== user.organizationId) {
      throw new NotFoundException('Ticket not found');
    }
    if (!isStaff(user) && ticket.requesterId !== user.id) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket as Prisma.TicketGetPayload<{ include: T }>;
  }

  private async saveAttachments(commentId: string, files: Express.Multer.File[]) {
    for (const file of files) {
      const key = `attachments/${commentId}-${Date.now()}-${file.originalname}`;
      const fileUrl = await this.storage.uploadBuffer(key, file.buffer, file.mimetype);
      await this.prisma.attachment.create({
        data: {
          commentId,
          fileName: file.originalname,
          fileUrl,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      });
    }
  }

  // AI suggestions are an internal triage aid, not a customer-facing fact — only
  // included for staff, mirroring how INTERNAL comments are already kept staff-only.
  private toTicketSummary(ticket: Prisma.TicketGetPayload<{ include: typeof TICKET_LIST_INCLUDE }>, staff: boolean) {
    return {
      id: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      requester: ticket.requester,
      assignee: ticket.assignee,
      tags: ticket.tags.map((t) => t.tag),
      commentCount: ticket._count.comments,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      firstResponseAt: ticket.firstResponseAt,
      resolvedAt: ticket.resolvedAt,
      responseDueAt: ticket.responseDueAt,
      resolutionDueAt: ticket.resolutionDueAt,
      responseBreached: ticket.responseBreached,
      resolutionBreached: ticket.resolutionBreached,
      slaPausedAt: ticket.slaPausedAt,
      aiSuggestedPriority: staff ? ticket.aiSuggestedPriority : null,
      aiSuggestedTags: staff ? ticket.aiSuggestedTags : [],
    };
  }

  private toTicketDetail(ticket: TicketWithDetail, user: AuthenticatedUser) {
    const staff = isStaff(user);
    const visibleComments = staff
      ? ticket.comments
      : ticket.comments.filter((c) => c.visibility === CommentVisibility.PUBLIC);

    return {
      id: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      requester: ticket.requester,
      assignee: ticket.assignee,
      tags: ticket.tags.map((t) => t.tag),
      comments: visibleComments,
      mergedInto: ticket.mergedInto,
      splitFrom: ticket.splitFrom,
      reopenedCount: ticket.reopenedCount,
      firstResponseAt: ticket.firstResponseAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      responseDueAt: ticket.responseDueAt,
      resolutionDueAt: ticket.resolutionDueAt,
      responseBreached: ticket.responseBreached,
      resolutionBreached: ticket.resolutionBreached,
      slaPausedAt: ticket.slaPausedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      aiSuggestedPriority: staff ? ticket.aiSuggestedPriority : null,
      aiSuggestedTags: staff ? ticket.aiSuggestedTags : [],
      csatRating: ticket.csatRating,
      csatComment: ticket.csatComment,
      csatRatedAt: ticket.csatRatedAt,
    };
  }
}
