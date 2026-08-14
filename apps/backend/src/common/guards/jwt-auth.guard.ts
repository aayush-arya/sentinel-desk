import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeysService } from '../../api-keys/api-keys.service';

/**
 * Global default guard. Every route requires a valid access token unless
 * annotated with @Public(). Registered as APP_GUARD in AppModule.
 *
 * Skips non-HTTP contexts: RealtimeGateway authenticates sockets itself in
 * handleConnection (there's no Express request to pull a cookie from once a
 * WS message handler runs), so this guard — and Passport's HTTP-oriented
 * request extraction — has nothing valid to do there.
 *
 * Also doubles as the entry point for the public API: a request carrying
 * `Authorization: Bearer sk_live_...` is checked against ApiKeysService instead
 * of the cookie-based JWT strategy, so the same routes serve both the web app
 * and external API clients without duplicating controllers.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeys: ApiKeysService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer sk_live_')) {
      const user = await this.apiKeys.validateKey(
        authHeader.slice('Bearer '.length),
      );
      if (!user) throw new UnauthorizedException('Invalid API key');
      request.user = user;
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
