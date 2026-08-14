import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { OrganizationService } from './organization.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organization: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's organization" })
  findOne(@CurrentUser() user: AuthenticatedUser) {
    return this.organization.findOne(user);
  }

  @RequireCsrf()
  @Roles(RoleName.ADMIN)
  @Patch()
  @ApiOperation({ summary: 'Update organization name/logo/brand color (admin only)' })
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganizationDto) {
    return this.organization.update(user, dto);
  }
}
