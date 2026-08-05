import type { TicketPriority, TicketStatus } from '@sentinel-desk/types';
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@sentinel-desk/types';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  ON_HOLD: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  RESOLVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  CLOSED: 'bg-zinc-500/10 text-zinc-500',
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  LOW: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  MEDIUM: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  HIGH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  URGENT: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export function TicketStatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className,
      )}
    >
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}

export function TicketPriorityBadge({ priority, className }: { priority: TicketPriority; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {TICKET_PRIORITY_LABELS[priority]}
    </span>
  );
}
