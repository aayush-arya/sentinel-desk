import Anthropic from '@anthropic-ai/sdk';
import { CommentSentiment, TicketPriority } from '@prisma/client';
import type { AppConfig } from '../../config/configuration';
import type {
  AiProvider,
  DuplicateCandidate,
  DuplicateCandidateInput,
  PrioritySuggestion,
  TicketContext,
} from '../ai-provider.interface';

// Strip tags rather than pull in a full HTML parser — comment bodies are already
// sanitized to a small allowlist (see sanitize-html.util.ts), so this is just for
// turning that markup into plain prose the model reads naturally.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// suggestReply/summarizeTicket deliberately only ever see PUBLIC comments — this is
// enforced here structurally, not just by prompt instruction, so an internal note can
// never end up quoted in a customer-facing draft no matter what the model does.
function renderPublicTranscript(ticket: TicketContext): string {
  const lines = ticket.comments
    .filter((c) => c.visibility === 'PUBLIC')
    .map((c) => `${c.authorIsStaff ? 'Agent' : 'Customer'} (${c.authorName}): ${stripHtml(c.body)}`);
  return `Subject: ${ticket.subject}\n\n${lines.join('\n\n')}`;
}

// Constructed manually by ai.module.ts's AI_PROVIDER factory (only when actually
// selected) rather than registered as its own Nest provider — the Anthropic SDK
// throws at construction time if no API key is configured, and Nest eagerly builds
// every registered provider regardless of which one AI_PROVIDER resolves to.
export class AnthropicAiProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(aiConfig: AppConfig['ai']) {
    this.client = new Anthropic({ apiKey: aiConfig.anthropicApiKey });
    this.model = aiConfig.anthropicModel;
  }

  private async completeText(system: string, userContent: string, maxTokens = 512): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    });
    const block = response.content.find((b) => b.type === 'text');
    return block?.type === 'text' ? block.text.trim() : '';
  }

  private async completeTool<T>(
    system: string,
    userContent: string,
    tool: Anthropic.Tool,
    maxTokens = 512,
  ): Promise<T> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    });
    const block = response.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') {
      throw new Error(`Anthropic returned no tool_use block for ${tool.name}`);
    }
    return block.input as T;
  }

  async summarizeTicket(ticket: TicketContext): Promise<string> {
    return this.completeText(
      'You are a support-desk assistant. Summarize this ticket thread for an agent who is ' +
        "about to pick it up: the customer's issue, what's already been tried, and the " +
        'current state. 2-4 plain sentences, no preamble, no markdown.',
      renderPublicTranscript(ticket),
    );
  }

  async suggestReply(ticket: TicketContext): Promise<string> {
    const draft = await this.completeText(
      'You are drafting a reply for a support agent to review and send. Write a helpful, ' +
        "polite, concise reply to the customer's most recent message, in the context of " +
        'the thread so far. Plain prose paragraphs only, no markdown, no greeting/signature ' +
        'boilerplate, no placeholders like [name] — write it as ready-to-send prose.',
      renderPublicTranscript(ticket),
      768,
    );
    return draft
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join('');
  }

  async analyzeSentiment(text: string): Promise<CommentSentiment> {
    const result = await this.completeTool<{ sentiment: CommentSentiment }>(
      "Classify the customer's tone in this support message.",
      stripHtml(text),
      {
        name: 'classify_sentiment',
        description: "Record the customer's sentiment.",
        input_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string', enum: Object.values(CommentSentiment) },
          },
          required: ['sentiment'],
        },
      },
      64,
    );
    return result.sentiment;
  }

  async suggestPriority(input: { subject: string; body: string }): Promise<PrioritySuggestion> {
    return this.completeTool<PrioritySuggestion>(
      'Suggest a support ticket priority based on urgency and business impact, not just tone.',
      `Subject: ${input.subject}\n\n${stripHtml(input.body)}`,
      {
        name: 'suggest_priority',
        description: 'Record the suggested priority and a one-sentence reason.',
        input_schema: {
          type: 'object',
          properties: {
            priority: { type: 'string', enum: Object.values(TicketPriority) },
            reasoning: { type: 'string' },
          },
          required: ['priority', 'reasoning'],
        },
      },
      128,
    );
  }

  async suggestTags(input: { subject: string; body: string; existingTagNames: string[] }): Promise<string[]> {
    const result = await this.completeTool<{ tags: string[] }>(
      'Suggest up to 3 short, lowercase-kebab-case tags categorizing this ticket. Prefer ' +
        'reusing one of the existing tags below when it genuinely fits over inventing a new one.',
      `Existing tags: ${input.existingTagNames.join(', ') || '(none yet)'}\n\n` +
        `Subject: ${input.subject}\n\n${stripHtml(input.body)}`,
      {
        name: 'suggest_tags',
        description: 'Record up to 3 suggested tags.',
        input_schema: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' }, maxItems: 3 },
          },
          required: ['tags'],
        },
      },
      128,
    );
    return result.tags;
  }

  async findDuplicates(
    target: { subject: string; body: string },
    candidates: DuplicateCandidateInput[],
  ): Promise<DuplicateCandidate[]> {
    if (candidates.length === 0) return [];

    const candidateList = candidates
      .map((c) => `id=${c.id} #${c.number}: ${c.subject}\n${stripHtml(c.firstCommentBody).slice(0, 300)}`)
      .join('\n\n');

    const result = await this.completeTool<{ duplicates: DuplicateCandidate[] }>(
      'Compare the new ticket against the candidate list and flag any that describe the ' +
        'same underlying issue. Only include genuine likely duplicates (confidence >= 0.5) — ' +
        'an empty list is the right answer when nothing matches. Use the exact id given.',
      `New ticket:\nSubject: ${target.subject}\n${stripHtml(target.body)}\n\n` +
        `Candidates:\n${candidateList}`,
      {
        name: 'flag_duplicates',
        description: 'Record likely duplicate tickets from the candidate list.',
        input_schema: {
          type: 'object',
          properties: {
            duplicates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ticketId: { type: 'string' },
                  confidence: { type: 'number' },
                  reasoning: { type: 'string' },
                },
                required: ['ticketId', 'confidence', 'reasoning'],
              },
            },
          },
          required: ['duplicates'],
        },
      },
      512,
    );
    const validIds = new Set(candidates.map((c) => c.id));
    return result.duplicates.filter((d) => validIds.has(d.ticketId));
  }
}
