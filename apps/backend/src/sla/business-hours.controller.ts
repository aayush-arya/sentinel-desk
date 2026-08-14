import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { BusinessHoursService } from './business-hours.service';
import { CreateBusinessHoursDto } from './dto/create-business-hours.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

const ADMIN_ROLES = [RoleName.ADMIN, RoleName.MANAGER];

@ApiTags('sla')
@Roles(...ADMIN_ROLES)
@Controller('sla/business-hours')
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {}

  @Get()
  @ApiOperation({ summary: 'List business hours schedules' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.businessHoursService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a business hours schedule' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.businessHoursService.findOne(user.organizationId, id);
  }

  @RequireCsrf()
  @Post()
  @ApiOperation({ summary: 'Create a business hours schedule' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessHoursDto,
  ) {
    return this.businessHoursService.create(user.organizationId, dto);
  }

  @RequireCsrf()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a business hours schedule' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessHoursDto,
  ) {
    return this.businessHoursService.update(user.organizationId, id, dto);
  }

  @RequireCsrf()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a business hours schedule' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.businessHoursService.remove(user.organizationId, id);
  }
}
