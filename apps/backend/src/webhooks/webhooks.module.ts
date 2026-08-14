import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import { WEBHOOK_DELIVERY_QUEUE } from './webhooks.constants';

@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOK_DELIVERY_QUEUE })],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookDeliveryProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
