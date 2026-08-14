'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';
import type { TicketStatus, TicketSummary } from '@sentinel-desk/types';
import { TICKET_STATUS_LABELS } from '@sentinel-desk/types';
import { useTickets, useUpdateTicketStatus, type TicketFilters } from '@/hooks/use-tickets';
import { getApiErrorMessage } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TicketPriorityBadge } from '@/components/tickets/ticket-badges';
import { cn } from '@/lib/utils';

const ITEM_TYPE = 'TICKET_CARD';

const COLUMNS: TicketStatus[] = ['OPEN', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];

interface DragItem {
  id: string;
  status: TicketStatus;
}

function KanbanCard({ ticket }: { ticket: TicketSummary }) {
  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: ITEM_TYPE,
    item: { id: ticket.id, status: ticket.status },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <Link
      ref={dragRef as unknown as React.Ref<HTMLAnchorElement>}
      href={`/dashboard/tickets/${ticket.id}`}
      className={cn(
        'card-interactive block cursor-grab space-y-2 rounded-lg border border-border bg-card p-3 text-sm shadow-sm hover:border-primary/40 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground">#{ticket.number}</span>
        {(ticket.responseBreached || ticket.resolutionBreached) && (
          <span className="size-2 shrink-0 rounded-full bg-red-500" title="SLA breached" />
        )}
      </div>
      <p className="line-clamp-2 font-medium">{ticket.subject}</p>
      <div className="flex items-center justify-between">
        <TicketPriorityBadge priority={ticket.priority} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {ticket.commentCount}
          </span>
          {ticket.assignee && (
            <Avatar className="size-5">
              <AvatarFallback className="text-[9px]">
                {ticket.assignee.firstName[0]}
                {ticket.assignee.lastName[0]}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </Link>
  );
}

function KanbanColumn({
  status,
  tickets,
  onDropTicket,
}: {
  status: TicketStatus;
  tickets: TicketSummary[];
  onDropTicket: (ticketId: string, from: TicketStatus, to: TicketStatus) => void;
}) {
  const [{ isOver }, dropRef] = useDrop<DragItem, unknown, { isOver: boolean }>(() => ({
    accept: ITEM_TYPE,
    drop: (item) => {
      if (item.status !== status) onDropTicket(item.id, item.status, status);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/30 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-sm font-medium">{TICKET_STATUS_LABELS[status]}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tickets.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {tickets.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">No tickets</p>
        ) : (
          tickets.map((ticket) => <KanbanCard key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ filters }: { filters: Omit<TicketFilters, 'status' | 'pageSize' | 'sortBy'> }) {
  const { data, isLoading } = useTickets({ ...filters, pageSize: 100, sortBy: 'updatedAt', sortOrder: 'desc' });
  const updateStatus = useUpdateTicketStatus();

  const byStatus = useMemo(() => {
    const grouped = new Map<TicketStatus, TicketSummary[]>(COLUMNS.map((s) => [s, []]));
    for (const ticket of data?.items ?? []) {
      grouped.get(ticket.status)?.push(ticket);
    }
    return grouped;
  }, [data]);

  const handleDrop = (ticketId: string, from: TicketStatus, to: TicketStatus) => {
    updateStatus.mutate(
      { ticketId, status: to },
      {
        onError: (error) => toast.error(getApiErrorMessage(error, 'Unable to move ticket')),
      },
    );
    void from;
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((status) => (
          <Skeleton key={status} className="h-96 w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Card className="overflow-x-auto p-3">
        <div className="flex gap-3">
          {COLUMNS.map((status) => (
            <KanbanColumn key={status} status={status} tickets={byStatus.get(status) ?? []} onDropTicket={handleDrop} />
          ))}
        </div>
      </Card>
    </DndProvider>
  );
}
