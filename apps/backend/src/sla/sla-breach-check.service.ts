import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { NotificationType, TicketHistoryAction, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { SLA_NOTIFICATIONS_QUEUE } from './sla.constants';

const NEXT_PRIORITY: Record<TicketPriority, TicketPriority> = {
  LOW: TicketPriority.MEDIUM,
  MEDIUM: TicketPriority.HIGH,
  HIGH: TicketPriority.URGENT,
  URGENT: TicketPriority.URGENT,
};

const TICKET_CONTEXT_INCLUDE = {
  assignee: { select: { id: true, email: true, firstName: true } },
  requester: { select: { id: true, email: true, firstName: true } },
} as const;

@Injectable()
export class SlaBreachCheckService {
  private readonly logger = new Logger(SlaBreachCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
    @InjectQueue(SLA_NOTIFICATIONS_QUEUE) private readonly emailQueue: Queue,
  ) {}

  /** Pushes a live update to the ticket + org rooms and, if there's someone to tell, an in-app notification. */
  private async notifyAndBroadcast(
    ticket: { id: string; organizationId: string; number: number; subject: string; assignee: { id: string } | null },
    type: NotificationType,
    title: string,
  ) {
    this.realtime.emitToTicket(ticket.id, 'ticket:updated', { ticketId: ticket.id });
    this.realtime.emitToOrg(ticket.organizationId, 'ticket:updated', { ticketId: ticket.id });

    if (ticket.assignee) {
      await this.notificationsService.create({
        organizationId: ticket.organizationId,
        userId: ticket.assignee.id,
        type,
        title,
        body: ticket.subject,
        ticketId: ticket.id,
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep() {
    try {
      const [responseBreaches, resolutionBreaches, escalations] = await Promise.all([
        this.checkResponseBreaches(),
        this.checkResolutionBreaches(),
        this.checkAutoEscalations(),
      ]);
      if (responseBreaches + resolutionBreaches + escalations > 0) {
        this.logger.log(
          `SLA sweep: ${responseBreaches} response breach(es), ${resolutionBreaches} resolution breach(es), ${escalations} auto-escalation(s)`,
        );
      }
    } catch (error) {
      // A failed sweep must never crash the process — it just tries again next minute.
      this.logger.error('SLA sweep failed', error);
    }
  }

  private async checkResponseBreaches(): Promise<number> {
    const now = new Date();
    const candidates = await this.prisma.ticket.findMany({
      where: {
        responseDueAt: { lt: now },
        firstResponseAt: null,
        responseBreached: false,
        slaPausedAt: null,
        status: { not: TicketStatus.CLOSED },
      },
      include: TICKET_CONTEXT_INCLUDE,
    });

    for (const ticket of candidates) {
      await this.prisma.$transaction([
        this.prisma.ticket.update({ where: { id: ticket.id }, data: { responseBreached: true } }),
        this.prisma.ticketHistory.create({
          data: { ticketId: ticket.id, action: TicketHistoryAction.RESPONSE_SLA_BREACHED },
        }),
      ]);
      await this.emailQueue.add('breach', {
        ticketId: ticket.id,
        organizationId: ticket.organizationId,
        ticketNumber: ticket.number,
        subject: ticket.subject,
        kind: 'response' as const,
        assigneeEmail: ticket.assignee?.email ?? null,
        assigneeFirstName: ticket.assignee?.firstName ?? null,
      });
      await this.notifyAndBroadcast(
        ticket,
        NotificationType.SLA_BREACHED,
        `Response SLA breached on ticket #${ticket.number}`,
      );
    }
    return candidates.length;
  }

  private async checkResolutionBreaches(): Promise<number> {
    const now = new Date();
    const candidates = await this.prisma.ticket.findMany({
      where: {
        resolutionDueAt: { lt: now },
        resolvedAt: null,
        resolutionBreached: false,
        slaPausedAt: null,
        status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
      },
      include: TICKET_CONTEXT_INCLUDE,
    });

    for (const ticket of candidates) {
      await this.prisma.$transaction([
        this.prisma.ticket.update({ where: { id: ticket.id }, data: { resolutionBreached: true } }),
        this.prisma.ticketHistory.create({
          data: { ticketId: ticket.id, action: TicketHistoryAction.RESOLUTION_SLA_BREACHED },
        }),
      ]);
      await this.emailQueue.add('breach', {
        ticketId: ticket.id,
        organizationId: ticket.organizationId,
        ticketNumber: ticket.number,
        subject: ticket.subject,
        kind: 'resolution' as const,
        assigneeEmail: ticket.assignee?.email ?? null,
        assigneeFirstName: ticket.assignee?.firstName ?? null,
      });
      await this.notifyAndBroadcast(
        ticket,
        NotificationType.SLA_BREACHED,
        `Resolution SLA breached on ticket #${ticket.number}`,
      );
    }
    return candidates.length;
  }

  /**
   * Escalates tickets that have burned through `autoEscalateAtPercent` of their
   * resolution window without being resolved. The elapsed-percent estimate uses plain
   * wall-clock time between createdAt and resolutionDueAt rather than re-deriving
   * business-hours-weighted elapsed time — close enough for a threshold check, and far
   * simpler than the alternative.
   */
  private async checkAutoEscalations(): Promise<number> {
    const now = new Date();
    const candidates = await this.prisma.ticket.findMany({
      where: {
        resolvedAt: null,
        slaEscalatedAt: null,
        slaPausedAt: null,
        resolutionDueAt: { not: null },
        status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        priority: { not: 'URGENT' },
      },
      include: { ...TICKET_CONTEXT_INCLUDE, slaPolicy: true },
    });

    let escalatedCount = 0;
    for (const ticket of candidates) {
      if (!ticket.resolutionDueAt || !ticket.slaPolicy) continue;
      const totalWindowMs = ticket.resolutionDueAt.getTime() - ticket.createdAt.getTime();
      if (totalWindowMs <= 0) continue;
      const elapsedMs = now.getTime() - ticket.createdAt.getTime();
      const elapsedPercent = (elapsedMs / totalWindowMs) * 100;
      if (elapsedPercent < ticket.slaPolicy.autoEscalateAtPercent) continue;

      const nextPriority = NEXT_PRIORITY[ticket.priority];
      await this.prisma.$transaction([
        this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { priority: nextPriority, slaEscalatedAt: now },
        }),
        this.prisma.ticketHistory.create({
          data: {
            ticketId: ticket.id,
            action: TicketHistoryAction.AUTO_ESCALATED,
            metadata: { fromPriority: ticket.priority, toPriority: nextPriority, elapsedPercent: Math.round(elapsedPercent) },
          },
        }),
      ]);
      await this.emailQueue.add('breach', {
        ticketId: ticket.id,
        organizationId: ticket.organizationId,
        ticketNumber: ticket.number,
        subject: ticket.subject,
        kind: 'escalation' as const,
        assigneeEmail: ticket.assignee?.email ?? null,
        assigneeFirstName: ticket.assignee?.firstName ?? null,
      });
      await this.notifyAndBroadcast(
        ticket,
        NotificationType.SLA_ESCALATED,
        `Ticket #${ticket.number} auto-escalated to ${nextPriority}`,
      );
      escalatedCount++;
    }
    return escalatedCount;
  }
}
