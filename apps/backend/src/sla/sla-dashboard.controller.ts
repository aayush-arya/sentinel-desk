import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { SlaDashboardService } from './sla-dashboard.service';
import { QueryViolationsDto } from './dto/query-violations.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('sla')
@Roles(RoleName.SENIOR_AGENT, RoleName.MANAGER, RoleName.ADMIN)
@Controller('sla')
export class SlaDashboardController {
  constructor(private readonly slaDashboardService: SlaDashboardService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'SLA compliance summary: on-track/at-risk/breached counts and 30-day compliance rate',
  })
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.slaDashboardService.getSummary(user.organizationId);
  }

  @Get('violations')
  @ApiOperation({
    summary: 'Paginated list of tickets that have breached their SLA',
  })
  getViolations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryViolationsDto,
  ) {
    return this.slaDashboardService.getViolations(user.organizationId, query);
  }
}
