import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * @nestjs/throttler's default guard unconditionally calls context.switchToHttp()
 * to read the request/response — there's no such thing on a WS message handler,
 * so without this override every gateway @SubscribeMessage would throw. Rate
 * limiting for the realtime layer is handled implicitly (typing/join events are
 * inherently low-frequency); this only exempts WS from the HTTP throttle, it
 * doesn't add a WS-specific one.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return Promise.resolve(true);
    return super.canActivate(context);
  }
}
