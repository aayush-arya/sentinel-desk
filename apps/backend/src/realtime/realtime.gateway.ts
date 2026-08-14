import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import type { AppConfig } from '../config/configuration';
import type {
  AuthenticatedUser,
  JwtAccessPayload,
} from '../auth/types/jwt-payload.type';

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

interface AuthenticatedSocket extends Socket {
  data: { user?: AuthenticatedUser };
}

// Gateway decorator options are evaluated at class-definition time, before Nest's DI
// container exists — so unlike everywhere else in this app, this reads process.env
// directly instead of going through ConfigService.
@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  // orgId -> userId -> active socket count (a user may have several tabs/devices open)
  private readonly presence = new Map<string, Map<string, number>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const cookies = parseCookies(client.handshake.headers.cookie);
      const token = cookies['sd_access'];
      if (!token) throw new Error('Missing access token');

      const payload = await this.jwt.verifyAsync<JwtAccessPayload>(token, {
        secret: this.config.get('jwt', { infer: true }).accessSecret,
      });
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new Error('Session is no longer valid');
      }

      client.data.user = {
        id: payload.sub,
        organizationId: payload.orgId,
        role: payload.role,
        permissions: payload.permissions,
        sessionId: payload.sessionId,
      };

      await client.join(`org:${payload.orgId}`);
      await client.join(`user:${payload.sub}`);
      this.trackPresence(payload.orgId, payload.sub, 1);
    } catch (error) {
      this.logger.warn(`WS connection rejected: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) return;
    this.trackPresence(user.organizationId, user.id, -1);
  }

  private trackPresence(organizationId: string, userId: string, delta: number) {
    let orgPresence = this.presence.get(organizationId);
    if (!orgPresence) {
      orgPresence = new Map();
      this.presence.set(organizationId, orgPresence);
    }
    const current = orgPresence.get(userId) ?? 0;
    const next = current + delta;
    if (next <= 0) orgPresence.delete(userId);
    else orgPresence.set(userId, next);

    const wasOnline = current > 0;
    const isOnline = next > 0;
    if (wasOnline !== isOnline) {
      this.server
        .to(`org:${organizationId}`)
        .emit('presence:update', { userId, online: isOnline });
    }
  }

  getOnlineUserIds(organizationId: string): string[] {
    return Array.from(this.presence.get(organizationId)?.keys() ?? []);
  }

  @SubscribeMessage('ticket:join')
  async handleTicketJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.ticketId) return;
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: data.ticketId },
    });
    if (!ticket || ticket.organizationId !== user.organizationId) return;
    if (user.role === 'CUSTOMER' && ticket.requesterId !== user.id) return;
    await client.join(`ticket:${data.ticketId}`);
  }

  @SubscribeMessage('ticket:leave')
  handleTicketLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    if (!data?.ticketId) return;
    client.leave(`ticket:${data.ticketId}`);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.ticketId) return;
    client.to(`ticket:${data.ticketId}`).emit('ticket:typing', {
      ticketId: data.ticketId,
      userId: user.id,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.ticketId) return;
    client.to(`ticket:${data.ticketId}`).emit('ticket:typing', {
      ticketId: data.ticketId,
      userId: user.id,
      isTyping: false,
    });
  }

  // ── called by other services to push events ─────────────────────

  emitToTicket(ticketId: string, event: string, payload: unknown) {
    this.server.to(`ticket:${ticketId}`).emit(event, payload);
  }

  emitToOrg(organizationId: string, event: string, payload: unknown) {
    this.server.to(`org:${organizationId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
