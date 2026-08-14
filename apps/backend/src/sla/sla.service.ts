import { Injectable, Logger } from '@nestjs/common';
import { TicketHistoryAction, TicketPriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  addBusinessMinutes,
  type BusinessHoursConfig,
} from './business-hours.util';

interface DueDates {
  slaPolicyId: string | null;
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
}

type ScheduleWithSlotsAndHolidays = {
  timezone: string;
  slots: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  holidays: { date: Date }[];
};

function toBusinessHoursConfig(
  schedule: ScheduleWithSlotsAndHolidays,
): BusinessHoursConfig {
  return {
    timezone: schedule.timezone,
    slots: schedule.slots,
    holidayDates: schedule.holidays.map((h) =>
      h.date.toISOString().slice(0, 10),
    ),
  };
}

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Computes response/resolution due dates for a newly created ticket using the org's default policy. */
  async computeDueDatesForNewTicket(
    organizationId: string,
    priority: TicketPriority,
    from: Date = new Date(),
  ): Promise<DueDates> {
    const policy = await this.prisma.slaPolicy.findFirst({
      where: { organizationId, isDefault: true },
      include: {
        rules: true,
        businessHours: { include: { slots: true, holidays: true } },
      },
    });
    if (!policy)
      return { slaPolicyId: null, responseDueAt: null, resolutionDueAt: null };

    const rule = policy.rules.find((r) => r.priority === priority);
    if (!rule)
      return {
        slaPolicyId: policy.id,
        responseDueAt: null,
        resolutionDueAt: null,
      };

    const config = toBusinessHoursConfig(policy.businessHours);
    return {
      slaPolicyId: policy.id,
      responseDueAt: addBusinessMinutes(
        from,
        rule.responseTargetMinutes,
        config,
      ),
      resolutionDueAt: addBusinessMinutes(
        from,
        rule.resolutionTargetMinutes,
        config,
      ),
    };
  }

  /**
   * Re-derives due dates as if the ticket had carried `newPriority` since creation.
   * Simpler and more predictable than prorating partially-elapsed time under the old
   * priority, at the cost of not crediting time already spent — an acceptable tradeoff
   * since priority changes are relatively rare and usually happen early in a ticket's life.
   */
  async recomputeDueDatesForPriorityChange(
    ticketId: string,
    newPriority: TicketPriority,
  ): Promise<Partial<DueDates>> {
    const ticket = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    if (!ticket.slaPolicyId) return {};

    const policy = await this.prisma.slaPolicy.findUniqueOrThrow({
      where: { id: ticket.slaPolicyId },
      include: {
        rules: true,
        businessHours: { include: { slots: true, holidays: true } },
      },
    });
    const rule = policy.rules.find((r) => r.priority === newPriority);
    if (!rule) return {};

    const config = toBusinessHoursConfig(policy.businessHours);
    const update: Partial<DueDates> = {};
    if (!ticket.firstResponseAt) {
      update.responseDueAt = addBusinessMinutes(
        ticket.createdAt,
        rule.responseTargetMinutes,
        config,
      );
    }
    if (!ticket.resolvedAt) {
      update.resolutionDueAt = addBusinessMinutes(
        ticket.createdAt,
        rule.resolutionTargetMinutes,
        config,
      );
    }
    return update;
  }

  /** Stops the SLA clock — called when a ticket moves to PENDING or ON_HOLD. */
  async pause(ticketId: string, actorId: string) {
    const ticket = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    if (ticket.slaPausedAt) return; // already paused; avoid clobbering the original pause timestamp

    await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { slaPausedAt: new Date() },
      }),
      this.prisma.ticketHistory.create({
        data: { ticketId, actorId, action: TicketHistoryAction.SLA_PAUSED },
      }),
    ]);
  }

  /**
   * Resumes the SLA clock — called when a ticket moves back to OPEN. Shifts any
   * still-pending due dates forward by the exact wall-clock pause duration. This is
   * intentionally simpler than re-running business-hours math over the pause window:
   * it slightly over-credits paused time that fell outside business hours anyway, which
   * only ever benefits the agent, never breaches a ticket that would otherwise be on time.
   */
  async resume(ticketId: string, actorId: string) {
    const ticket = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    if (!ticket.slaPausedAt) return;

    const pausedMs = Date.now() - ticket.slaPausedAt.getTime();
    const data: {
      slaPausedAt: null;
      responseDueAt?: Date;
      resolutionDueAt?: Date;
    } = { slaPausedAt: null };
    if (!ticket.firstResponseAt && ticket.responseDueAt) {
      data.responseDueAt = new Date(ticket.responseDueAt.getTime() + pausedMs);
    }
    if (!ticket.resolvedAt && ticket.resolutionDueAt) {
      data.resolutionDueAt = new Date(
        ticket.resolutionDueAt.getTime() + pausedMs,
      );
    }

    await this.prisma.$transaction([
      this.prisma.ticket.update({ where: { id: ticketId }, data }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          actorId,
          action: TicketHistoryAction.SLA_RESUMED,
          metadata: { pausedMinutes: Math.round(pausedMs / 60_000) },
        },
      }),
    ]);
  }
}
