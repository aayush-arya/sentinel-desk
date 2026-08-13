import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
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
  @ApiOperation({ summary: 'Ticket volume, response/resolution time trends, and status/priority breakdowns' })
  getOverview(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAnalyticsDto) {
    return this.analyticsService.getOverview(user.organizationId, query.days ?? 30);
  }
}
