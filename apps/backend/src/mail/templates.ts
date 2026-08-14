function layout(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f5f7;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366F1,#8B5CF6);"></div>
                  <span style="font-weight:700;font-size:16px;color:#111827;">SentinelDesk</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;color:#374151;font-size:14px;line-height:22px;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <p style="color:#9CA3AF;font-size:12px;margin-top:20px;">© ${new Date().getUTCFullYear()} SentinelDesk. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#6366F1;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${label}</a>`;
}

export function verifyEmailTemplate(
  firstName: string,
  verifyUrl: string,
): string {
  return layout(
    'Verify your email to activate your SentinelDesk account.',
    `<h2 style="color:#111827;font-size:18px;margin:0 0 12px;">Verify your email</h2>
     <p>Hi ${firstName},</p>
     <p>Thanks for signing up for SentinelDesk. Confirm your email address to activate your account.</p>
     ${button(verifyUrl, 'Verify email')}
     <p style="color:#6B7280;font-size:12px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`,
  );
}

export function resetPasswordTemplate(
  firstName: string,
  resetUrl: string,
): string {
  return layout(
    'Reset your SentinelDesk password.',
    `<h2 style="color:#111827;font-size:18px;margin:0 0 12px;">Reset your password</h2>
     <p>Hi ${firstName},</p>
     <p>We received a request to reset your password. Click below to choose a new one.</p>
     ${button(resetUrl, 'Reset password')}
     <p style="color:#6B7280;font-size:12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not change.</p>`,
  );
}

export function inviteTemplate(
  inviterName: string,
  organizationName: string,
  roleLabel: string,
  inviteUrl: string,
): string {
  return layout(
    `You've been invited to join ${organizationName} on SentinelDesk.`,
    `<h2 style="color:#111827;font-size:18px;margin:0 0 12px;">You're invited</h2>
     <p>${inviterName} invited you to join <strong>${organizationName}</strong> on SentinelDesk as a <strong>${roleLabel}</strong>.</p>
     ${button(inviteUrl, 'Accept invite')}
     <p style="color:#6B7280;font-size:12px;">This link expires in 7 days.</p>`,
  );
}

const SLA_NOTICE_COPY: Record<
  'response' | 'resolution' | 'escalation',
  { heading: string; body: string }
> = {
  response: {
    heading: 'Response SLA breached',
    body: 'has missed its first-response target and needs attention.',
  },
  resolution: {
    heading: 'Resolution SLA breached',
    body: 'has missed its resolution target.',
  },
  escalation: {
    heading: 'Ticket auto-escalated',
    body: 'was automatically escalated after burning through most of its resolution window unresolved.',
  },
};

export function slaNoticeTemplate(
  firstName: string,
  ticketNumber: number,
  subject: string,
  kind: 'response' | 'resolution' | 'escalation',
  ticketUrl: string,
): string {
  const copy = SLA_NOTICE_COPY[kind];
  return layout(
    `SentinelDesk: ${copy.heading} on ticket #${ticketNumber}`,
    `<h2 style="color:#111827;font-size:18px;margin:0 0 12px;">${copy.heading}</h2>
     <p>Hi ${firstName},</p>
     <p>Ticket <strong>#${ticketNumber} — ${subject}</strong> ${copy.body}</p>
     ${button(ticketUrl, 'Open ticket')}`,
  );
}
