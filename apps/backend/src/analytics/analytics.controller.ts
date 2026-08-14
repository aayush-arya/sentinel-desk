import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('analytics')
@Roles(RoleName.SENIOR_AGENT, RoleName.MANAGER, RoleName.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Ticket volume, response/resolution time trends, and status/priority breakdowns',
  })
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAnalyticsDto,
  ) {
    return this.analyticsService.getOverview(
      user.organizationId,
      query.days ?? 30,
    );
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Download the analytics overview as a PDF report' })
  async exportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAnalyticsDto,
    @Res() res: Response,
  ) {
    // A Buffer returned normally would get JSON-serialized by Nest's default
    // response handling ({"type":"Buffer","data":[...]}), not sent as binary - only
    // @Res() with a manual .send() writes the raw bytes with the right headers.
    const pdf = await this.analyticsService.generateReportPdf(user.organizationId, query.days ?? 30);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="sentineldesk-analytics-report.pdf"',
    });
    res.send(pdf);
  }
}
