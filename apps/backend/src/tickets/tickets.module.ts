import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { SlaModule } from '../sla/sla.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SlaModule, RealtimeModule, NotificationsModule],
  controllers: [TicketsController, TagsController],
  providers: [TicketsService, TagsService],
  exports: [TicketsService],
})
export class TicketsModule {}
