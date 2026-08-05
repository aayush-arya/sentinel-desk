import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { SlaModule } from '../sla/sla.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AI_ENRICHMENT_QUEUE } from '../ai/ai.constants';

@Module({
  // Registering the AI queue here (in addition to AiModule) makes TicketsService a
  // producer without depending on AiModule itself — AiModule depends on TicketsModule
  // (for its access-check reuse in AiController), so the reverse would be circular.
  imports: [SlaModule, RealtimeModule, NotificationsModule, BullModule.registerQueue({ name: AI_ENRICHMENT_QUEUE })],
  controllers: [TicketsController, TagsController],
  providers: [TicketsService, TagsService],
  exports: [TicketsService],
})
export class TicketsModule {}
