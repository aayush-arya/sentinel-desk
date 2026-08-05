import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AiService } from './ai.service';
import { AI_ENRICHMENT_QUEUE } from './ai.constants';

export type AiEnrichmentJobData =
  | { kind: 'ticket-created'; ticketId: string }
  | { kind: 'comment-sentiment'; commentId: string };

@Processor(AI_ENRICHMENT_QUEUE)
export class AiEnrichmentProcessor extends WorkerHost {
  constructor(private readonly ai: AiService) {
    super();
  }

  async process(job: Job<AiEnrichmentJobData>) {
    switch (job.data.kind) {
      case 'ticket-created':
        return this.ai.enrichNewTicket(job.data.ticketId);
      case 'comment-sentiment':
        return this.ai.analyzeCommentSentiment(job.data.commentId);
    }
  }
}
