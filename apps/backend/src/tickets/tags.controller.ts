import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List tags available in the current organization' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tagsService.findAll(user.organizationId);
  }

  @Roles(RoleName.AGENT, RoleName.SENIOR_AGENT, RoleName.MANAGER, RoleName.ADMIN)
  @RequireCsrf()
  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTagDto) {
    return this.tagsService.create(user.organizationId, dto);
  }
}
