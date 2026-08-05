import { Injectable } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { QueryViolationsDto } from './dto/query-violations.dto';

const AT_RISK_THRESHOLD_PERCENT = 75;
const COMPLIANCE_WINDOW_DAYS = 30;

@Injectable()
export class SlaDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    const activeTickets = await this.prisma.ticket.findMany({
      where: { organizationId, status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
      select: {
        createdAt: true,
        resolutionDueAt: true,
        responseBreached: true,
        resolutionBreached: true,
      },
    });

    const now = Date.now();
    let onTrack = 0;
    let atRisk = 0;
    let breached = 0;
    for (const ticket of activeTickets) {
      if (ticket.responseBreached || ticket.resolutionBreached) {
        breached++;
        continue;
      }
      if (ticket.resolutionDueAt) {
        const totalMs = ticket.resolutionDueAt.getTime() - ticket.createdAt.getTime();
        const elapsedMs = now - ticket.createdAt.getTime();
        if (totalMs > 0 && (elapsedMs / totalMs) * 100 >= AT_RISK_THRESHOLD_PERCENT) {
          atRisk++;
          continue;
        }
      }
      onTrack++;
    }

    const windowStart = new Date(now - COMPLIANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const resolvedRecently = await this.prisma.ticket.findMany({
      where: { organizationId, resolvedAt: { gte: windowStart } },
      select: { resolutionBreached: true },
    });
    const compliantCount = resolvedRecently.filter((t) => !t.resolutionBreached).length;
    const complianceRate =
      resolvedRecently.length > 0 ? Math.round((compliantCount / resolvedRecently.length) * 100) : null;

    return {
      totalActive: activeTickets.length,
      onTrack,
      atRisk,
      breached,
      complianceRate,
      resolvedLast30Days: resolvedRecently.length,
    };
  }

  async getViolations(organizationId: string, query: QueryViolationsDto) {
    const where: Prisma.TicketWhereInput = { organizationId };
    if (query.kind === 'response') where.responseBreached = true;
    else if (query.kind === 'resolution') where.resolutionBreached = true;
    else where.OR = [{ responseBreached: true }, { resolutionBreached: true }];

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          requester: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }
}
