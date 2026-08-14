import { randomBytes } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { CreateWebhookDto } from './dto/create-webhook.dto';
import {
  WEBHOOK_DELIVERY_QUEUE,
  type WebhookEvent,
} from './webhooks.constants';
import type { WebhookDeliveryJobData } from './webhook-delivery.processor';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_DELIVERY_QUEUE)
    private readonly queue: Queue<WebhookDeliveryJobData>,
  ) {}

  // The signing secret is only ever returned from create() - excluded here via an
  // explicit select, not just left off by convention, so a future field addition to
  // the model can't silently leak it back out through this list endpoint.
  findAll(user: AuthenticatedUser) {
    return this.prisma.webhook.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(user: AuthenticatedUser, dto: CreateWebhookDto) {
    const secret = randomBytes(24).toString('hex');
    return this.prisma.webhook.create({
      data: {
        organizationId: user.organizationId,
        url: dto.url,
        events: dto.events,
        secret,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.prisma.webhook.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Webhook not found');
    await this.prisma.webhook.delete({ where: { id } });
  }

  /** Fire-and-forget by design, mirroring AuditService.record - a webhook subscriber
   * being down must never affect the request that triggered the event. */
  async trigger(
    organizationId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: { organizationId, isActive: true, events: { has: event } },
    });
    for (const webhook of webhooks) {
      await this.queue.add('deliver', {
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        event,
        payload,
      });
    }
  }
}
