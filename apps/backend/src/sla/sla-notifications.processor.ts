import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SLA_NOTIFICATIONS_QUEUE } from './sla.constants';

export interface BreachJobData {
  ticketId: string;
  organizationId: string;
  ticketNumber: number;
  subject: string;
  kind: 'response' | 'resolution' | 'escalation';
  assigneeEmail: string | null;
  assigneeFirstName: string | null;
}

@Processor(SLA_NOTIFICATIONS_QUEUE)
export class SlaNotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaNotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super();
  }

  async process(job: Job<BreachJobData>) {
    const { ticketId, organizationId, ticketNumber, subject, kind, assigneeEmail, assigneeFirstName } = job.data;

    if (assigneeEmail && assigneeFirstName) {
      await this.mail.sendSlaNotice(assigneeEmail, assigneeFirstName, ticketId, ticketNumber, subject, kind);
      return;
    }

    // Unassigned ticket — fall back to the org's admins so a breach never silently
    // goes unnoticed just because nobody had picked it up yet.
    const admins = await this.prisma.user.findMany({
      where: { organizationId, role: { name: RoleName.ADMIN } },
      select: { email: true, firstName: true },
    });
    for (const admin of admins) {
      await this.mail.sendSlaNotice(admin.email, admin.firstName, ticketId, ticketNumber, subject, kind);
    }
    if (admins.length === 0) {
      this.logger.warn(`No assignee or admin to notify for ticket #${ticketNumber} SLA ${kind} event`);
    }
  }
}
