import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RealtimeGateway } from './realtime.gateway';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('realtime')
@Controller('realtime')
export class PresenceController {
  constructor(private readonly gateway: RealtimeGateway) {}

  @Get('presence')
  @ApiOperation({
    summary: 'Snapshot of currently-online user IDs in your organization',
  })
  getPresence(@CurrentUser() user: AuthenticatedUser) {
    return {
      onlineUserIds: this.gateway.getOnlineUserIds(user.organizationId),
    };
  }
}
