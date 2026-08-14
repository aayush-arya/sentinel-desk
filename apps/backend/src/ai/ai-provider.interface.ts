import type { CommentSentiment, TicketPriority } from '@prisma/client';

export interface TicketContext {
  subject: string;
  comments: {
    authorName: string;
    authorIsStaff: boolean;
    body: string;
    visibility: 'PUBLIC' | 'INTERNAL';
  }[];
}

export interface PrioritySuggestion {
  priority: TicketPriority;
  reasoning: string;
}

export interface DuplicateCandidate {
  ticketId: string;
  confidence: number; // 0-1
  reasoning: string;
}

export interface DuplicateCandidateInput {
  id: string;
  number: number;
  subject: string;
  firstCommentBody: string;
}

export interface KnowledgeArticleRecommendation {
  articleId: string;
  confidence: number; // 0-1
  reasoning: string;
}

export interface KnowledgeArticleCandidateInput {
  id: string;
  title: string;
  excerpt: string;
}

/**
 * Swappable AI backend — every method takes plain data (never Prisma models) so
 * providers stay implementations of a contract, not consumers of app internals.
 * Selected via AI_PROVIDER env var; see ai.module.ts for the DI wiring.
 */
export interface AiProvider {
  summarizeTicket(ticket: TicketContext): Promise<string>;

  suggestReply(ticket: TicketContext): Promise<string>;

  analyzeSentiment(text: string): Promise<CommentSentiment>;

  suggestPriority(input: {
    subject: string;
    body: string;
  }): Promise<PrioritySuggestion>;

  suggestTags(input: {
    subject: string;
    body: string;
    existingTagNames: string[];
  }): Promise<string[]>;

  findDuplicates(
    target: { subject: string; body: string },
    candidates: DuplicateCandidateInput[],
  ): Promise<DuplicateCandidate[]>;

  recommendArticles(
    target: { subject: string; body: string },
    candidates: KnowledgeArticleCandidateInput[],
  ): Promise<KnowledgeArticleRecommendation[]>;
}
