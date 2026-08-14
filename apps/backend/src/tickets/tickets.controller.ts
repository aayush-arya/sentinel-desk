import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { RateCsatDto } from './dto/rate-csat.dto';
import { MergeTicketDto } from './dto/merge-ticket.dto';
import { SplitTicketDto } from './dto/split-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

const STAFF_ROLES = [
  RoleName.AGENT,
  RoleName.SENIOR_AGENT,
  RoleName.MANAGER,
  RoleName.ADMIN,
];
const ATTACHMENT_LIMITS = { fileSize: 25 * 1024 * 1024 };

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @RequireCsrf()
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Create a ticket (customers file their own; staff may file on behalf of one)',
  })
  @UseInterceptors(FilesInterceptor('files', 10, { limits: ATTACHMENT_LIMITS }))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.ticketsService.create(user, dto, files);
  }

  @Get()
  @ApiOperation({ summary: 'List tickets (customers see only their own)' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTicketsDto,
  ) {
    return this.ticketsService.findAll(user, query);
  }

  // Must be registered before ':id' - otherwise Nest would match "export" as an id.
  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tickets.csv"')
  @ApiOperation({
    summary:
      'Export the current filtered ticket list as CSV (capped at 5000 rows)',
  })
  exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTicketsDto,
  ) {
    return this.ticketsService.exportCsv(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket detail with its comment thread' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.findOne(user, id);
  }

  @RequireCsrf()
  @Patch(':id')
  @ApiOperation({
    summary:
      'Update subject (anyone with access) or priority/status (staff only)',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(user, id, dto);
  }

  @RequireCsrf()
  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen a resolved or closed ticket' })
  reopen(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.reopen(user, id);
  }

  @RequireCsrf()
  @Post(':id/csat')
  @ApiOperation({
    summary: 'Rate a resolved/closed ticket 1-5 (requester only, once)',
  })
  rateCsat(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RateCsatDto,
  ) {
    return this.ticketsService.rateCsat(user, id, dto);
  }

  @RequireCsrf()
  @Post(':id/comments')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Reply to a ticket (staff may add an internal-only note)',
  })
  @UseInterceptors(FilesInterceptor('files', 10, { limits: ATTACHMENT_LIMITS }))
  addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.ticketsService.addComment(user, id, dto, files);
  }

  @Roles(...STAFF_ROLES)
  @RequireCsrf()
  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign an unassigned ticket to an agent' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assign(user, id, dto);
  }

  @Roles(...STAFF_ROLES)
  @RequireCsrf()
  @Post(':id/transfer')
  @ApiOperation({
    summary: 'Reassign an already-assigned ticket to a different agent',
  })
  transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assign(user, id, dto);
  }

  @Roles(...STAFF_ROLES)
  @RequireCsrf()
  @Delete(':id/assignee')
  @ApiOperation({ summary: 'Unassign a ticket' })
  unassign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.unassign(user, id);
  }

  @Roles(...STAFF_ROLES)
  @RequireCsrf()
  @Post(':id/escalate')
  @ApiOperation({
    summary: 'Escalate a ticket — bumps priority and optionally reassigns',
  })
  escalate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EscalateTicketDto,
  ) {
    return this.ticketsService.escalate(user, id, dto);
  }

  @Roles(...STAFF_ROLES)
  @RequireCsrf()
  @Post(':id/merge')
  @ApiOperation({ summary: 'Merge this ticket into another, surviving ticket' })
  merge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MergeTicketDto,
  ) {
    return this.ticketsService.merge(user, id, dto);
  }

  @Roles(...STAFF_ROLES)
  @RequireCsrf()
  @Post(':id/split')
  @ApiOperation({ summary: 'Split selected comments off into a new ticket' })
  split(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SplitTicketDto,
  ) {
    return this.ticketsService.split(user, id, dto);
  }

  @Roles(...STAFF_ROLES)
  @RequireCsrf()
  @Post(':id/tags/:tagId')
  @ApiOperation({ summary: 'Add a tag to a ticket' })
  addTag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.ticketsService.addTag(user, id, tagId);
  }

  @Roles(...STAFF_ROLES)
  @RequireCsrf()
  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Remove a tag from a ticket' })
  removeTag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.ticketsService.removeTag(user, id, tagId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get the full audit timeline for a ticket' })
  getHistory(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.getHistory(user, id);
  }

  @RequireCsrf()
  @Post(':id/watch')
  @ApiOperation({ summary: 'Watch a ticket to get notified of new replies' })
  watch(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.watch(user, id);
  }

  @RequireCsrf()
  @Delete(':id/watch')
  @ApiOperation({ summary: 'Stop watching a ticket' })
  unwatch(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.unwatch(user, id);
  }
}
