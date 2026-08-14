import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BusinessHoursController } from './business-hours.controller';
import { BusinessHoursService } from './business-hours.service';
import { SlaPoliciesController } from './sla-policies.controller';
import { SlaPoliciesService } from './sla-policies.service';
import { SlaDashboardController } from './sla-dashboard.controller';
import { SlaDashboardService } from './sla-dashboard.service';
import { SlaSimulatorController } from './sla-simulator.controller';
import { SlaBreachCheckService } from './sla-breach-check.service';
import { SlaNotificationsProcessor } from './sla-notifications.processor';
import { SlaService } from './sla.service';
import { SLA_NOTIFICATIONS_QUEUE } from './sla.constants';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: SLA_NOTIFICATIONS_QUEUE }),
    RealtimeModule,
    NotificationsModule,
  ],
  controllers: [
    BusinessHoursController,
    SlaPoliciesController,
    SlaDashboardController,
    SlaSimulatorController,
  ],
  providers: [
    BusinessHoursService,
    SlaPoliciesService,
    SlaDashboardService,
    SlaService,
    SlaBreachCheckService,
    SlaNotificationsProcessor,
  ],
  exports: [SlaService],
})
export class SlaModule {}
