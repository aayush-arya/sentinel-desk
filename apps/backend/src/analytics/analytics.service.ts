import { Injectable } from '@nestjs/common';
import { TicketPriority, TicketStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
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

    const [tickets, statusGroups, priorityGroups, csatAggregate] =
      await Promise.all([
        this.prisma.ticket.findMany({
          where: {
            organizationId,
            OR: [{ createdAt: { gte: since } }, { resolvedAt: { gte: since } }],
          },
          select: {
            createdAt: true,
            resolvedAt: true,
            firstResponseAt: true,
            csatRating: true,
            csatRatedAt: true,
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
        // Rated in the window, not created/resolved in it — a ticket rated today about
        // work closed weeks ago should still count toward "how are we doing lately".
        this.prisma.ticket.aggregate({
          where: { organizationId, csatRatedAt: { gte: since } },
          _avg: { csatRating: true },
          _count: { csatRating: true },
        }),
      ]);

    const dayKeys = buildDayRange(days);
    const volumeByDay = new Map(
      dayKeys.map((key) => [key, { created: 0, resolved: 0 }]),
    );
    const responseSumByDay = new Map(
      dayKeys.map((key) => [key, { totalMinutes: 0, count: 0 }]),
    );
    const resolutionSumByDay = new Map(
      dayKeys.map((key) => [key, { totalMinutes: 0, count: 0 }]),
    );

    for (const ticket of tickets) {
      const createdKey = dayKey(ticket.createdAt);
      if (volumeByDay.has(createdKey)) volumeByDay.get(createdKey)!.created++;

      if (ticket.resolvedAt) {
        const resolvedKey = dayKey(ticket.resolvedAt);
        if (volumeByDay.has(resolvedKey))
          volumeByDay.get(resolvedKey)!.resolved++;

        const resolutionMinutes =
          (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60_000;
        if (resolutionSumByDay.has(resolvedKey)) {
          const bucket = resolutionSumByDay.get(resolvedKey)!;
          bucket.totalMinutes += resolutionMinutes;
          bucket.count++;
        }
      }

      if (ticket.firstResponseAt) {
        const respondedKey = dayKey(ticket.firstResponseAt);
        const responseMinutes =
          (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) /
          60_000;
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
        avgResponseMinutes:
          response.count > 0
            ? Math.round(response.totalMinutes / response.count)
            : null,
        avgResolutionMinutes:
          resolution.count > 0
            ? Math.round(resolution.totalMinutes / resolution.count)
            : null,
      };
    });

    const statusCounts = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all]),
    );
    const priorityCounts = Object.fromEntries(
      priorityGroups.map((g) => [g.priority, g._count._all]),
    );

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
      avgCsat:
        csatAggregate._avg.csatRating != null
          ? Math.round(csatAggregate._avg.csatRating * 10) / 10
          : null,
      csatResponseCount: csatAggregate._count.csatRating,
    };
  }

  async generateReportPdf(
    organizationId: string,
    days: number,
  ): Promise<Buffer> {
    const [overview, org] = await Promise.all([
      this.getOverview(organizationId, days),
      this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { name: true },
      }),
    ]);

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    doc.fontSize(20).text('SentinelDesk Analytics Report', { align: 'left' });
    doc
      .fontSize(11)
      .fillColor('#666666')
      .text(
        `${org.name} · Last ${days} days · Generated ${new Date().toLocaleDateString()}`,
      );
    doc.moveDown(1.5);

    doc.fillColor('#000000').fontSize(14).text('Key metrics');
    doc.moveDown(0.5);
    const totalVolume = overview.volume.reduce((sum, v) => sum + v.created, 0);
    const totalResolved = overview.volume.reduce(
      (sum, v) => sum + v.resolved,
      0,
    );
    const kpis: [string, string][] = [
      ['Tickets created', String(totalVolume)],
      ['Tickets resolved', String(totalResolved)],
      [
        'Avg CSAT',
        overview.avgCsat != null
          ? `${overview.avgCsat} / 5 (${overview.csatResponseCount} ratings)`
          : 'No ratings yet',
      ],
    ];
    doc.fontSize(11);
    for (const [label, value] of kpis) {
      doc
        .text(`${label}: `, { continued: true })
        .fillColor('#333333')
        .text(value)
        .fillColor('#000000');
    }
    doc.moveDown(1);

    doc.fontSize(14).text('Status breakdown');
    doc.moveDown(0.5).fontSize(11);
    for (const s of overview.statusBreakdown) {
      doc.text(`${s.status}: ${s.count}`);
    }
    doc.moveDown(1);

    doc.fontSize(14).text('Priority breakdown');
    doc.moveDown(0.5).fontSize(11);
    for (const p of overview.priorityBreakdown) {
      doc.text(`${p.priority}: ${p.count}`);
    }

    doc.end();
    return done;
  }
}
