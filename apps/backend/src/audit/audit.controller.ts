import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('audit-logs')
@Roles(RoleName.ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated, filterable audit trail for the organization (admin only)' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAuditLogsDto) {
    return this.audit.findAll(user.organizationId, query);
  }
}
