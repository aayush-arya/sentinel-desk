import { Inject, Injectable, Logger } from '@nestjs/common';
import { KnowledgeArticleStatus, RoleName, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AI_PROVIDER } from './ai.constants';
import type { AiProvider, TicketContext } from './ai-provider.interface';

export interface DuplicateCandidateResult {
  ticketId: string;
  ticketNumber: number;
  subject: string;
  confidence: number;
  reasoning: string;
}

export interface ArticleRecommendationResult {
  articleId: string;
  title: string;
  slug: string;
  confidence: number;
  reasoning: string;
}

// Bounded, not a full semantic search over every ticket ever filed — duplicates are
// overwhelmingly likely to be recent and still open, and this keeps the prompt small.
const DUPLICATE_CANDIDATE_POOL_SIZE = 30;

// Same reasoning as duplicates - most orgs won't have hundreds of published articles,
// and this keeps the recommendation prompt small and cheap.
const KB_CANDIDATE_POOL_SIZE = 30;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** AI assist must never break the feature it's attached to — log and degrade instead of throwing. */
  private async safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.logger.warn(`${label} failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async getTicketContext(ticketId: string): Promise<TicketContext> {
    const [ticket, comments] = await Promise.all([
      this.prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { subject: true } }),
      this.prisma.comment.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { firstName: true, lastName: true, role: { select: { name: true } } } } },
      }),
    ]);
    return {
      subject: ticket.subject,
      comments: comments.map((c) => ({
        authorName: `${c.author.firstName} ${c.author.lastName}`,
        authorIsStaff: c.author.role.name !== RoleName.CUSTOMER,
        body: c.body,
        visibility: c.visibility,
      })),
    };
  }

  async summarizeTicket(ticketId: string): Promise<string | null> {
    const context = await this.getTicketContext(ticketId);
    return this.safe('summarizeTicket', () => this.provider.summarizeTicket(context));
  }

  async suggestReply(ticketId: string): Promise<string | null> {
    const context = await this.getTicketContext(ticketId);
    return this.safe('suggestReply', () => this.provider.suggestReply(context));
  }

  async findDuplicates(organizationId: string, ticketId: string): Promise<DuplicateCandidateResult[]> {
    const target = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: { subject: true, comments: { orderBy: { createdAt: 'asc' }, take: 1, select: { body: true } } },
    });

    const pool = await this.prisma.ticket.findMany({
      where: {
        organizationId,
        id: { not: ticketId },
        mergedIntoId: null,
        status: { in: [TicketStatus.OPEN, TicketStatus.PENDING, TicketStatus.ON_HOLD] },
      },
      orderBy: { createdAt: 'desc' },
      take: DUPLICATE_CANDIDATE_POOL_SIZE,
      select: { id: true, number: true, subject: true, comments: { orderBy: { createdAt: 'asc' }, take: 1, select: { body: true } } },
    });
    if (pool.length === 0) return [];

    const result = await this.safe('findDuplicates', () =>
      this.provider.findDuplicates(
        { subject: target.subject, body: target.comments[0]?.body ?? '' },
        pool.map((t) => ({ id: t.id, number: t.number, subject: t.subject, firstCommentBody: t.comments[0]?.body ?? '' })),
      ),
    );
    if (!result) return [];

    const byId = new Map(pool.map((t) => [t.id, t]));
    return result
      .map((d) => {
        const candidate = byId.get(d.ticketId);
        if (!candidate) return null;
        return { ticketId: d.ticketId, ticketNumber: candidate.number, subject: candidate.subject, confidence: d.confidence, reasoning: d.reasoning };
      })
      .filter((d): d is DuplicateCandidateResult => d !== null);
  }

  async recommendKnowledgeArticles(organizationId: string, ticketId: string): Promise<ArticleRecommendationResult[]> {
    const target = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: { subject: true, comments: { orderBy: { createdAt: 'asc' }, take: 1, select: { body: true } } },
    });

    const pool = await this.prisma.knowledgeArticle.findMany({
      where: { organizationId, status: KnowledgeArticleStatus.PUBLISHED },
      orderBy: { updatedAt: 'desc' },
      take: KB_CANDIDATE_POOL_SIZE,
      select: { id: true, title: true, slug: true, body: true },
    });
    if (pool.length === 0) return [];

    const result = await this.safe('recommendKnowledgeArticles', () =>
      this.provider.recommendArticles(
        { subject: target.subject, body: target.comments[0]?.body ?? '' },
        pool.map((a) => ({ id: a.id, title: a.title, excerpt: a.body })),
      ),
    );
    if (!result) return [];

    const byId = new Map(pool.map((a) => [a.id, a]));
    return result
      .map((r) => {
        const article = byId.get(r.articleId);
        if (!article) return null;
        return { articleId: r.articleId, title: article.title, slug: article.slug, confidence: r.confidence, reasoning: r.reasoning };
      })
      .filter((r): r is ArticleRecommendationResult => r !== null);
  }

  /** Queued right after a ticket is created — see TicketsService.create and the AI enrichment processor. */
  async enrichNewTicket(ticketId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        organizationId: true,
        subject: true,
        comments: { orderBy: { createdAt: 'asc' }, take: 1, select: { body: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    if (!ticket) return;
    const body = ticket.comments[0]?.body ?? '';
    const existingTagNames = ticket.tags.map((t) => t.tag.name);

    const [prioritySuggestion, tagSuggestions] = await Promise.all([
      this.safe('suggestPriority', () => this.provider.suggestPriority({ subject: ticket.subject, body })),
      this.safe('suggestTags', () => this.provider.suggestTags({ subject: ticket.subject, body, existingTagNames })),
    ]);
    if (!prioritySuggestion && !tagSuggestions) return;

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        aiSuggestedPriority: prioritySuggestion?.priority,
        aiSuggestedTags: tagSuggestions ?? undefined,
      },
    });
    this.realtime.emitToTicket(ticketId, 'ticket:updated', { ticketId });
    this.realtime.emitToOrg(ticket.organizationId, 'ticket:updated', { ticketId });
  }

  /** Queued right after a customer posts a PUBLIC comment — see TicketsService.addComment. */
  async analyzeCommentSentiment(commentId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { body: true, ticketId: true, ticket: { select: { organizationId: true } } },
    });
    if (!comment) return;

    const sentiment = await this.safe('analyzeSentiment', () => this.provider.analyzeSentiment(comment.body));
    if (!sentiment) return;

    await this.prisma.comment.update({ where: { id: commentId }, data: { sentiment } });
    this.realtime.emitToTicket(comment.ticketId, 'ticket:updated', { ticketId: comment.ticketId });
    this.realtime.emitToOrg(comment.ticket.organizationId, 'ticket:updated', { ticketId: comment.ticketId });
  }
}
