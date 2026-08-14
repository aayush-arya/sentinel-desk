'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TicketSummary } from '@sentinel-desk/types';
import { useTickets, type TicketFilters } from '@/hooks/use-tickets';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const AT_RISK_WINDOW_MS = 24 * 60 * 60 * 1000;

type BreachTone = 'breached' | 'at-risk' | 'on-track';

function toneFor(ticket: TicketSummary): BreachTone {
  if (ticket.resolutionBreached) return 'breached';
  if (ticket.resolutionDueAt) {
    const remaining = new Date(ticket.resolutionDueAt).getTime() - Date.now();
    if (remaining < AT_RISK_WINDOW_MS) return 'at-risk';
  }
  return 'on-track';
}

const TONE_DOT: Record<BreachTone, string> = {
  breached: 'bg-red-500',
  'at-risk': 'bg-amber-500',
  'on-track': 'bg-emerald-500',
};

const TONE_CHIP: Record<BreachTone, string> = {
  breached: 'bg-red-500/10 text-red-600 dark:text-red-400',
  'at-risk': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'on-track': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_PER_DAY = 3;

export function CalendarView({ filters }: { filters: Omit<TicketFilters, 'status' | 'pageSize' | 'sortBy'> }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  // Resolution due dates only ever matter for tickets that aren't resolved/closed yet -
  // fetching the whole open backlog and grouping client-side keeps this in line with the
  // kanban board's approach, and is plenty at this app's data volumes.
  const { data, isLoading } = useTickets({
    ...filters,
    status: ['OPEN', 'PENDING', 'ON_HOLD'],
    pageSize: 100,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = useMemo(() => {
    const grouped = new Map<string, TicketSummary[]>();
    for (const ticket of data?.items ?? []) {
      if (!ticket.resolutionDueAt) continue;
      const key = format(new Date(ticket.resolutionDueAt), 'yyyy-MM-dd');
      const existing = grouped.get(key) ?? [];
      existing.push(ticket);
      grouped.set(key, existing);
    }
    return grouped;
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const tickets = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={key}
              className={cn(
                'min-h-24 border-b border-r border-border p-1.5 last:border-r-0',
                !inMonth && 'bg-muted/20',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-5 items-center justify-center rounded-full text-xs',
                  isToday(day) ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground',
                  !inMonth && 'opacity-50',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {tickets.slice(0, MAX_VISIBLE_PER_DAY).map((ticket) => {
                  const tone = toneFor(ticket);
                  return (
                    <Link
                      key={ticket.id}
                      href={`/dashboard/tickets/${ticket.id}`}
                      className={cn(
                        'flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] font-medium transition-[transform,opacity] duration-150 hover:scale-[1.03] hover:opacity-80',
                        TONE_CHIP[tone],
                      )}
                      title={ticket.subject}
                    >
                      <span className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />
                      <span className="truncate">#{ticket.number} {ticket.subject}</span>
                    </Link>
                  );
                })}
                {tickets.length > MAX_VISIBLE_PER_DAY && (
                  <p className="px-1 text-[11px] text-muted-foreground">
                    +{tickets.length - MAX_VISIBLE_PER_DAY} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" /> On track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" /> Due within 24h
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500" /> Breached
        </span>
      </div>
    </Card>
  );
}
