import { Injectable } from '@nestjs/common';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDayRange(days: number): string[] {
  const keys: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(now - i * DAY_MS)));
  }
  return keys;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(organizationId: string, days: number) {
    const since = new Date(Date.now() - days * DAY_MS);

    const [tickets, statusGroups, priorityGroups] = await Promise.all([
      this.prisma.ticket.findMany({
        where: {
          organizationId,
          OR: [{ createdAt: { gte: since } }, { resolvedAt: { gte: since } }],
        },
        select: {
          createdAt: true,
          resolvedAt: true,
          firstResponseAt: true,
        },
      }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: { organizationId },
        _count: { _all: true },
      }),
    ]);

    const dayKeys = buildDayRange(days);
    const volumeByDay = new Map(dayKeys.map((key) => [key, { created: 0, resolved: 0 }]));
    const responseSumByDay = new Map(dayKeys.map((key) => [key, { totalMinutes: 0, count: 0 }]));
    const resolutionSumByDay = new Map(dayKeys.map((key) => [key, { totalMinutes: 0, count: 0 }]));

    for (const ticket of tickets) {
      const createdKey = dayKey(ticket.createdAt);
      if (volumeByDay.has(createdKey)) volumeByDay.get(createdKey)!.created++;

      if (ticket.resolvedAt) {
        const resolvedKey = dayKey(ticket.resolvedAt);
        if (volumeByDay.has(resolvedKey)) volumeByDay.get(resolvedKey)!.resolved++;

        const resolutionMinutes = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60_000;
        if (resolutionSumByDay.has(resolvedKey)) {
          const bucket = resolutionSumByDay.get(resolvedKey)!;
          bucket.totalMinutes += resolutionMinutes;
          bucket.count++;
        }
      }

      if (ticket.firstResponseAt) {
        const respondedKey = dayKey(ticket.firstResponseAt);
        const responseMinutes = (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / 60_000;
        if (responseSumByDay.has(respondedKey)) {
          const bucket = responseSumByDay.get(respondedKey)!;
          bucket.totalMinutes += responseMinutes;
          bucket.count++;
        }
      }
    }

    const volume = dayKeys.map((date) => ({ date, ...volumeByDay.get(date)! }));
    const responseTime = dayKeys.map((date) => {
      const response = responseSumByDay.get(date)!;
      const resolution = resolutionSumByDay.get(date)!;
      return {
        date,
        avgResponseMinutes: response.count > 0 ? Math.round(response.totalMinutes / response.count) : null,
        avgResolutionMinutes: resolution.count > 0 ? Math.round(resolution.totalMinutes / resolution.count) : null,
      };
    });

    const statusCounts = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));
    const priorityCounts = Object.fromEntries(priorityGroups.map((g) => [g.priority, g._count._all]));

    return {
      volume,
      responseTime,
      statusBreakdown: Object.values(TicketStatus).map((status) => ({
        status,
        count: statusCounts[status] ?? 0,
      })),
      priorityBreakdown: Object.values(TicketPriority).map((priority) => ({
        priority,
        count: priorityCounts[priority] ?? 0,
      })),
    };
  }
}
