import { Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AiService } from './ai.service';
import { TicketsService } from '../tickets/tickets.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

const STAFF_ROLES = [RoleName.AGENT, RoleName.SENIOR_AGENT, RoleName.MANAGER, RoleName.ADMIN];

// These are agent-triage tools, not customer-facing — gated to staff at the controller
// level. Each handler calls TicketsService.findOne first purely for its access-check
// side effect (org match + customer-can-only-see-own-tickets), reusing the exact same
// authorization logic as every other ticket route instead of duplicating it here.
@ApiTags('ai')
@Roles(...STAFF_ROLES)
@Controller('tickets/:id/ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly tickets: TicketsService,
  ) {}

  @RequireCsrf()
  @Post('summary')
  @ApiOperation({ summary: 'AI-generated summary of the ticket thread so far' })
  async summarize(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.tickets.findOne(user, id);
    const summary = await this.ai.summarizeTicket(id);
    return { summary };
  }

  @RequireCsrf()
  @Post('suggest-reply')
  @ApiOperation({ summary: 'AI-drafted reply for the agent to review, edit, and send' })
  async suggestReply(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.tickets.findOne(user, id);
    const reply = await this.ai.suggestReply(id);
    return { reply };
  }

  @RequireCsrf()
  @Post('duplicates')
  @ApiOperation({ summary: 'Find likely-duplicate tickets among recent open tickets in the org' })
  async duplicates(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.tickets.findOne(user, id);
    const candidates = await this.ai.findDuplicates(user.organizationId, id);
    return { candidates };
  }
}
