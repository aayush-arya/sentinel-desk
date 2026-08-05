import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { SlaPoliciesService } from './sla-policies.service';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

const ADMIN_ROLES = [RoleName.ADMIN, RoleName.MANAGER];

@ApiTags('sla')
@Roles(...ADMIN_ROLES)
@Controller('sla/policies')
export class SlaPoliciesController {
  constructor(private readonly slaPoliciesService: SlaPoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'List SLA policies' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.slaPoliciesService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an SLA policy' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.slaPoliciesService.findOne(user.organizationId, id);
  }

  @RequireCsrf()
  @Post()
  @ApiOperation({ summary: 'Create an SLA policy' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSlaPolicyDto) {
    return this.slaPoliciesService.create(user.organizationId, dto);
  }

  @RequireCsrf()
  @Patch(':id')
  @ApiOperation({ summary: 'Update an SLA policy' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSlaPolicyDto) {
    return this.slaPoliciesService.update(user.organizationId, id, dto);
  }

  @RequireCsrf()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an SLA policy' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.slaPoliciesService.remove(user.organizationId, id);
  }
}
