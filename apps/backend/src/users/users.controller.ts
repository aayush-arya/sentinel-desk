import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current user's profile" })
  async me(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    const profile = await this.usersService.findProfile(user.id);
    // The CSRF cookie is set by the backend's domain, so frontend JS can only ever
    // read it via document.cookie when frontend and backend share a site (local dev).
    // On a real deployment (frontend on one origin, API on another) that read always
    // comes back empty. Echoing the value here - which the browser DOES send back to
    // us correctly regardless of origin - lets the frontend source it from a response
    // body it can always read, then attach it to the X-CSRF-Token header itself.
    return { ...profile, csrfToken: req.cookies?.sd_csrf ?? null };
  }

  @RequireCsrf()
  @Patch('me')
  @ApiOperation({ summary: "Update the current user's profile" })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @RequireCsrf()
  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Upload the current user's avatar" })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  @Get()
  @ApiOperation({ summary: 'List members of the current organization' })
  listMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listOrgMembers(user.organizationId);
  }

  @Roles(RoleName.AGENT, RoleName.SENIOR_AGENT, RoleName.MANAGER, RoleName.ADMIN)
  @Get('assignable')
  @ApiOperation({ summary: 'List active staff members tickets can be assigned to' })
  listAssignable(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listAssignableAgents(user.organizationId);
  }

  @RequireCsrf()
  @RequirePermissions('user:invite')
  @Post('invite')
  @ApiOperation({ summary: 'Invite a new staff member or customer to the organization' })
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(user.id, user.organizationId, user.role, dto);
  }

  @RequireCsrf()
  @RequirePermissions('user:manage')
  @Patch(':id')
  @ApiOperation({ summary: "Change a member's role or suspend/reactivate them" })
  updateMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.usersService.updateMember(user.id, user.role, user.organizationId, id, dto);
  }
}
