'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Columns3, List as ListIcon, MessageSquare, Plus, Search } from 'lucide-react';
import type { TicketPriority, TicketStatus } from '@sentinel-desk/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useTickets } from '@/hooks/use-tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/tickets/ticket-badges';
import { KanbanBoard } from '@/components/tickets/kanban-board';
import { SavedFiltersMenu, type TicketFilterState } from '@/components/tickets/saved-filters-menu';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: TicketStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS: { value: TicketPriority | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export default function TicketsPage() {
  return (
    <Suspense>
      <TicketsPageContent />
    </Suspense>
  );
}

function TicketsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [view, setView] = useState<'list' | 'board'>('list');

  const status = searchParams.get('status') as TicketStatus | null;
  const priority = searchParams.get('priority') as TicketPriority | null;
  const assignee = searchParams.get('assignee') ?? undefined;

  const { data, isLoading } = useTickets({
    status: status ? [status] : undefined,
    priority: priority ? [priority] : undefined,
    assignee,
    search: search || undefined,
  });

  if (!user) return null;
  const staff = user.role.name !== 'CUSTOMER';

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'ALL' || !value) params.delete(key);
    else params.set(key, value);
    router.push(`/dashboard/tickets?${params.toString()}`);
  };

  const applySavedFilter = (filters: TicketFilterState) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.assignee) params.set('assignee', filters.assignee);
    if (filters.search) params.set('search', filters.search);
    setSearch(filters.search ?? '');
    router.push(`/dashboard/tickets?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {staff ? 'Tickets' : 'My tickets'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {staff ? 'Every conversation across your organization.' : 'Track and reply to your support requests.'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tickets/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="pl-8"
          />
        </div>
        <Select value={status ?? 'ALL'} onValueChange={(v) => setParam('status', v)}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority ?? 'ALL'} onValueChange={(v) => setParam('priority', v)}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {staff && (
          <Select value={assignee ?? 'ALL'} onValueChange={(v) => setParam('assignee', v)}>
            <SelectTrigger className="w-40" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All assignees</SelectItem>
              <SelectItem value="me">Assigned to me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        )}
        <SavedFiltersMenu
          currentFilters={{ status: status ?? undefined, priority: priority ?? undefined, assignee, search: search || undefined }}
          onApply={applySavedFilter}
        />
        {staff && (
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ListIcon className="size-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'board' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Columns3 className="size-3.5" />
              Board
            </button>
          </div>
        )}
      </div>

      {staff && view === 'board' ? (
        <KanbanBoard filters={{ priority: priority ? [priority] : undefined, assignee, search: search || undefined }} />
      ) : (
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <div className="divide-y divide-border">
            {data.items.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/tickets/${ticket.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
              >
                <span className="w-10 shrink-0 text-xs text-muted-foreground">#{ticket.number}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ticket.subject}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{ticket.requester.firstName} {ticket.requester.lastName}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {ticket.commentCount}
                    </span>
                    {ticket.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full px-1.5 py-0.5"
                        style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                {(ticket.responseBreached || ticket.resolutionBreached) && (
                  <span
                    className="flex size-2 shrink-0 rounded-full bg-red-500"
                    title="SLA breached"
                  />
                )}
                <TicketPriorityBadge priority={ticket.priority} className="shrink-0" />
                <TicketStatusBadge status={ticket.status} className="shrink-0" />
                <div className="w-8 shrink-0">
                  {ticket.assignee && (
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">
                        {ticket.assignee.firstName[0]}
                        {ticket.assignee.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <MessageSquare className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No tickets found</p>
            <p className="text-sm text-muted-foreground">
              {staff ? 'Nothing matches these filters.' : 'Create a ticket if you need help with something.'}
            </p>
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
