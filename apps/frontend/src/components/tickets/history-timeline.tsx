import type { TicketHistoryEntry } from '@sentinel-desk/types';

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'created the ticket',
  STATUS_CHANGED: 'changed the status',
  PRIORITY_CHANGED: 'changed the priority',
  ASSIGNED: 'assigned the ticket',
  UNASSIGNED: 'unassigned the ticket',
  TRANSFERRED: 'transferred the ticket',
  ESCALATED: 'escalated the ticket',
  TAG_ADDED: 'added a tag',
  TAG_REMOVED: 'removed a tag',
  MERGED: 'merged this ticket',
  MERGED_FROM: 'merged a ticket into this one',
  SPLIT: 'split off a new ticket',
  REOPENED: 'reopened the ticket',
  COMMENT_ADDED: 'replied',
  NOTE_ADDED: 'added an internal note',
  SLA_PAUSED: 'paused the SLA clock',
  SLA_RESUMED: 'resumed the SLA clock',
  RESPONSE_SLA_BREACHED: 'missed the response SLA',
  RESOLUTION_SLA_BREACHED: 'missed the resolution SLA',
  AUTO_ESCALATED: 'auto-escalated this ticket',
};

function describeMetadata(action: string, metadata: Record<string, unknown>): string | null {
  switch (action) {
    case 'STATUS_CHANGED':
      return `${metadata.from} → ${metadata.to}`;
    case 'PRIORITY_CHANGED':
      return `${metadata.from} → ${metadata.to}`;
    case 'TAG_ADDED':
    case 'TAG_REMOVED':
      return (metadata.tagName as string) ?? null;
    case 'ESCALATED':
      return (metadata.reason as string) ?? null;
    case 'MERGED':
      return `into #${metadata.intoTicketNumber}`;
    case 'MERGED_FROM':
      return `from #${metadata.fromTicketNumber}`;
    case 'SPLIT':
      return `into #${metadata.newTicketNumber}`;
    case 'SLA_RESUMED':
      return metadata.pausedMinutes != null ? `paused for ${metadata.pausedMinutes} min` : null;
    case 'AUTO_ESCALATED':
      return `${metadata.fromPriority} → ${metadata.toPriority}`;
    default:
      return null;
  }
}

export function HistoryTimeline({ entries }: { entries: TicketHistoryEntry[] }) {
  return (
    <ol className="space-y-3">
      {entries.map((entry) => {
        const detail = describeMetadata(entry.action, entry.metadata);
        return (
          <li key={entry.id} className="flex gap-3 text-sm">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <div>
              <p>
                <span className="font-medium">
                  {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'System'}
                </span>{' '}
                <span className="text-muted-foreground">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                {detail && <span className="text-muted-foreground"> — {detail}</span>}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
