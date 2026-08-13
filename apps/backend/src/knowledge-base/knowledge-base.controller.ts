import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

const STAFF_ROLES = [RoleName.AGENT, RoleName.SENIOR_AGENT, RoleName.MANAGER, RoleName.ADMIN];

@ApiTags('knowledge-base')
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBase: KnowledgeBaseService) {}

  @Get()
  @ApiOperation({ summary: 'List knowledge base articles (customers only ever see published ones)' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryArticlesDto) {
    return this.knowledgeBase.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single article' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const article = await this.knowledgeBase.findOne(user, id);
    void this.knowledgeBase.recordView(id);
    return article;
  }

  @RequireCsrf()
  @Roles(...STAFF_ROLES)
  @Post()
  @ApiOperation({ summary: 'Create a knowledge base article (starts as a draft unless status is set)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateArticleDto) {
    return this.knowledgeBase.create(user, dto);
  }

  @RequireCsrf()
  @Roles(...STAFF_ROLES)
  @Patch(':id')
  @ApiOperation({ summary: 'Update or publish/unpublish an article' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.knowledgeBase.update(user, id, dto);
  }

  @RequireCsrf()
  @Roles(...STAFF_ROLES)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an article' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.knowledgeBase.remove(user, id);
  }
}
