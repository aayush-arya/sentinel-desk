import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { SlaService } from './sla.service';
import { SimulateSlaDto } from './dto/simulate-sla.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('sla')
@Roles(
  RoleName.AGENT,
  RoleName.SENIOR_AGENT,
  RoleName.MANAGER,
  RoleName.ADMIN,
)
@Controller('sla/simulate')
export class SlaSimulatorController {
  constructor(private readonly slaService: SlaService) {}

  @Get()
  @ApiOperation({
    summary:
      "Preview response/resolution due dates for a hypothetical ticket, using the org's default SLA policy and business hours",
  })
  simulate(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SimulateSlaDto,
  ) {
    return this.slaService.simulate(
      user.organizationId,
      query.priority,
      query.from ? new Date(query.from) : undefined,
    );
  }
}
