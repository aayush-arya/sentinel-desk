export const WEBHOOK_DELIVERY_QUEUE = 'webhook-delivery';

export const WEBHOOK_EVENTS = [
  'ticket.created',
  'ticket.status_changed',
  'ticket.escalated',
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
