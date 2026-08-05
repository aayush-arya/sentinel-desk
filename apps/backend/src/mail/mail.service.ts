import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { AppConfig } from '../config/configuration';
import {
  inviteTemplate,
  resetPasswordTemplate,
  slaNoticeTemplate,
  verifyEmailTemplate,
} from './templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const mail = this.config.get('mail', { infer: true });
    this.from = mail.from;
    this.frontendUrl = this.config.get('frontendUrl', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.secure,
      auth: mail.user ? { user: mail.user, pass: mail.password } : undefined,
    });
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${subject}`, error);
    }
  }

  sendVerificationEmail(to: string, firstName: string, token: string) {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    return this.send(to, 'Verify your email — SentinelDesk', verifyEmailTemplate(firstName, url));
  }

  sendPasswordResetEmail(to: string, firstName: string, token: string) {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    return this.send(to, 'Reset your password — SentinelDesk', resetPasswordTemplate(firstName, url));
  }

  sendInviteEmail(
    to: string,
    inviterName: string,
    organizationName: string,
    roleLabel: string,
    token: string,
  ) {
    const url = `${this.frontendUrl}/accept-invite?token=${token}`;
    return this.send(
      to,
      `You're invited to join ${organizationName} on SentinelDesk`,
      inviteTemplate(inviterName, organizationName, roleLabel, url),
    );
  }

  sendSlaNotice(
    to: string,
    firstName: string,
    ticketId: string,
    ticketNumber: number,
    subject: string,
    kind: 'response' | 'resolution' | 'escalation',
  ) {
    const url = `${this.frontendUrl}/dashboard/tickets/${ticketId}`;
    const label = kind === 'escalation' ? 'auto-escalated' : `${kind} SLA breached`;
    return this.send(
      to,
      `SentinelDesk: Ticket #${ticketNumber} ${label}`,
      slaNoticeTemplate(firstName, ticketNumber, subject, kind, url),
    );
  }
}
