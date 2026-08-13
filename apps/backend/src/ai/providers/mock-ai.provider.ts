import { Injectable } from '@nestjs/common';
import { CommentSentiment, TicketPriority } from '@prisma/client';
import type {
  AiProvider,
  DuplicateCandidate,
  DuplicateCandidateInput,
  KnowledgeArticleCandidateInput,
  KnowledgeArticleRecommendation,
  PrioritySuggestion,
  TicketContext,
} from '../ai-provider.interface';

const NEGATIVE_WORDS = [
  'angry', 'frustrated', 'terrible', 'awful', 'broken', 'unacceptable', 'worst',
  'ridiculous', 'refund', 'cancel', 'furious', 'disappointed', 'useless', 'still not working',
];
const POSITIVE_WORDS = [
  'thanks', 'thank you', 'great', 'awesome', 'perfect', 'appreciate', 'resolved', 'works now', 'excellent',
];
const URGENT_WORDS = ['down', 'outage', 'critical', 'urgent', 'cannot log in', "can't log in", 'production', 'security', 'breach'];
const HIGH_WORDS = ['broken', 'not working', 'error', 'failing', 'blocked', 'asap'];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on',
  'for', 'with', 'this', 'that', 'it', 'my', 'i', 'we', 'our', 'not', 'be', 'can', 'when', 'after',
  'as', 'at', 'by', 'from', 'have', 'has', 'had', 'will', 'would', 'should', 'there', 'their',
  'them', 'these', 'those', 'all', 'any', 'now', 'right', 'everyone', 'you', 'your', 'us',
]);

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordSet(text: string): Set<string> {
  return new Set(
    stripHtml(text)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

/**
 * Deterministic, keyword-based implementation — no network calls, no API key needed.
 * This is the default (AI_PROVIDER=mock) so the app is fully runnable out of the box;
 * it is intentionally simple, not a stand-in for the real thing.
 */
@Injectable()
export class MockAiProvider implements AiProvider {
  async summarizeTicket(ticket: TicketContext): Promise<string> {
    const publicComments = ticket.comments.filter((c) => c.visibility === 'PUBLIC');
    const last = publicComments[publicComments.length - 1];
    const latest = last ? stripHtml(last.body).slice(0, 160) : 'No messages yet.';
    return `"${ticket.subject}" — ${publicComments.length} message(s) so far. Most recent from ${last?.authorName ?? 'n/a'}: ${latest}`;
  }

  async suggestReply(ticket: TicketContext): Promise<string> {
    const publicComments = ticket.comments.filter((c) => c.visibility === 'PUBLIC');
    const last = publicComments[publicComments.length - 1];
    const ack = last ? stripHtml(last.body).slice(0, 80) : ticket.subject;
    return (
      `<p>Thanks for the details — I can see you're describing: "${ack}...".</p>` +
      '<p>I\'m looking into this now and will follow up shortly with next steps.</p>'
    );
  }

  async analyzeSentiment(text: string): Promise<CommentSentiment> {
    const lower = stripHtml(text).toLowerCase();
    if (NEGATIVE_WORDS.some((w) => lower.includes(w))) return CommentSentiment.NEGATIVE;
    if (POSITIVE_WORDS.some((w) => lower.includes(w))) return CommentSentiment.POSITIVE;
    return CommentSentiment.NEUTRAL;
  }

  async suggestPriority(input: { subject: string; body: string }): Promise<PrioritySuggestion> {
    const lower = `${input.subject} ${stripHtml(input.body)}`.toLowerCase();
    if (URGENT_WORDS.some((w) => lower.includes(w))) {
      return { priority: TicketPriority.URGENT, reasoning: 'Contains language suggesting a critical/production-impacting issue.' };
    }
    if (HIGH_WORDS.some((w) => lower.includes(w))) {
      return { priority: TicketPriority.HIGH, reasoning: 'Describes something actively broken or blocking.' };
    }
    return { priority: TicketPriority.MEDIUM, reasoning: 'No urgency signals detected; defaulting to standard priority.' };
  }

  async suggestTags(input: { subject: string; body: string; existingTagNames: string[] }): Promise<string[]> {
    const words = Array.from(wordSet(`${input.subject} ${input.body}`)).slice(0, 6);
    const existingLower = input.existingTagNames.map((t) => t.toLowerCase());
    const tags: string[] = [];
    for (const word of words) {
      const reused = existingLower.find((t) => t.includes(word) || word.includes(t));
      const tag = reused ?? word;
      if (!tags.includes(tag)) tags.push(tag);
      if (tags.length === 3) break;
    }
    return tags;
  }

  async findDuplicates(
    target: { subject: string; body: string },
    candidates: DuplicateCandidateInput[],
  ): Promise<DuplicateCandidate[]> {
    const targetWords = wordSet(`${target.subject} ${target.body}`);
    return candidates
      .map((c) => ({
        ticketId: c.id,
        confidence: Math.round(jaccard(targetWords, wordSet(`${c.subject} ${c.firstCommentBody}`)) * 100) / 100,
        reasoning: 'Significant word overlap with the new ticket.',
      }))
      // Natural-language paraphrases rarely hit 50%+ raw word overlap even when a human
      // would call them clear duplicates — 0.3 catches realistic near-duplicates while
      // still requiring substantial overlap, not just one or two shared words.
      .filter((d) => d.confidence >= 0.3)
      .sort((a, b) => b.confidence - a.confidence);
  }

  async recommendArticles(
    target: { subject: string; body: string },
    candidates: KnowledgeArticleCandidateInput[],
  ): Promise<KnowledgeArticleRecommendation[]> {
    const targetWords = wordSet(`${target.subject} ${target.body}`);
    return candidates
      .map((c) => ({
        articleId: c.id,
        confidence: Math.round(jaccard(targetWords, wordSet(`${c.title} ${c.excerpt}`)) * 100) / 100,
        reasoning: 'Shares significant keywords with this ticket.',
      }))
      // Article titles are short, so raw word-overlap ratios run lower here than for
      // ticket-vs-ticket duplicate detection even on a strong match (verified against a
      // real "production payments outage" ticket + article pair, which scored 0.13) -
      // 0.08 catches genuine keyword overlap without a length-dependent threshold.
      .filter((r) => r.confidence >= 0.08)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
}
