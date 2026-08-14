import { createHmac } from 'node:crypto';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  WEBHOOK_DELIVERY_QUEUE,
  type WebhookEvent,
} from './webhooks.constants';

export interface WebhookDeliveryJobData {
  webhookId: string;
  url: string;
  secret: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}

const DELIVERY_TIMEOUT_MS = 8_000;

@Processor(WEBHOOK_DELIVERY_QUEUE, { concurrency: 5 })
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  async process(job: Job<WebhookDeliveryJobData>) {
    const { webhookId, url, secret, event, payload } = job.data;
    const body = JSON.stringify({
      event,
      data: payload,
      timestamp: new Date().toISOString(),
    });
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SentinelDesk-Signature': signature,
          'X-SentinelDesk-Event': event,
        },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `Webhook ${webhookId} responded with ${response.status}`,
        );
      }
    } catch (error) {
      // BullMQ retries per the queue's default job options - log and let it retry
      // rather than crash the worker over one subscriber's downtime.
      this.logger.warn(
        `Delivery to webhook ${webhookId} (${url}) failed: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
