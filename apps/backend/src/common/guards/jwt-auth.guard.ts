import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global default guard. Every route requires a valid access token unless
 * annotated with @Public(). Registered as APP_GUARD in AppModule.
 *
 * Skips non-HTTP contexts: RealtimeGateway authenticates sockets itself in
 * handleConnection (there's no Express request to pull a cookie from once a
 * WS message handler runs), so this guard — and Passport's HTTP-oriented
 * request extraction — has nothing valid to do there.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
