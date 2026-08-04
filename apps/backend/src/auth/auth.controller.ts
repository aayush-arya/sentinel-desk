import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SignupCustomerDto } from './dto/signup-customer.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import { setAuthCookies, clearAuthCookies } from '../common/utils/auth-cookies.util';
import type { AppConfig } from '../config/configuration';
import type { AuthenticatedUser } from './types/jwt-payload.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private cookieConfig() {
    const cookie = this.config.get('cookie', { infer: true });
    return { secure: cookie.secure, domain: cookie.domain };
  }

  private meta(req: Request) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('signup')
  @ApiOperation({ summary: 'Create a new organization and its first admin user' })
  signup(@Body() dto: SignupDto, @Req() req: Request) {
    return this.authService.signup(dto, this.meta(req));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('signup-customer')
  @ApiOperation({ summary: "Self-register as a customer on an org's support portal" })
  signupCustomer(@Body() dto: SignupCustomerDto, @Req() req: Request) {
    return this.authService.signupCustomer(dto, this.meta(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept a staff/customer invite and set a password' })
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.acceptInvite(dto, this.meta(req));
    setAuthCookies(res, result, this.cookieConfig());
    return { user: result.user, csrfToken: result.csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email + password' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, this.meta(req));
    setAuthCookies(res, result, this.cookieConfig());
    return { user: result.user, csrfToken: result.csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the refresh token and mint a new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.sd_refresh;
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    const result = await this.authService.refresh(refreshToken, this.meta(req));
    setAuthCookies(res, result, this.cookieConfig());
    return { user: result.user, csrfToken: result.csrfToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sessionId);
    clearAuthCookies(res, this.cookieConfig());
  }

  @RequireCsrf()
  @Post('logout-all-others')
  @ApiOperation({ summary: 'Revoke every session except the current one' })
  async logoutAllOthers(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.authService.logoutAllOtherSessions(user.id, user.sessionId);
    return { revokedCount: count };
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Confirm an email verification token' })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email verified. You can now log in.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend the email verification link' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset link' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password updated. Please log in again.' };
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions for the current user' })
  listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listSessions(user.id, user.sessionId);
  }

  @RequireCsrf()
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session (e.g. sign out another device)' })
  revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.authService.revokeSession(user.id, id);
  }
}
