import Link from 'next/link';
import { AlertTriangle, CalendarClock, CheckCircle2, Inbox, ListTodo, Timer } from 'lucide-react';
import type { TicketSummary, UserProfile } from '@sentinel-desk/types';
import { useTickets } from '@/hooks/use-tickets';
import { useSlaDashboard } from '@/hooks/use-sla';
import { canViewSlaDashboard } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/tickets/ticket-badges';
import { SlaCountdown } from '@/components/tickets/sla-countdown';
import { StatCard } from '@/components/dashboard/stat-card';

const AT_RISK_WINDOW_MS = 2 * 60 * 60 * 1000;

function isDueToday(dueAt: string | null): boolean {
  if (!dueAt) return false;
  return new Date(dueAt).toDateString() === new Date().toDateString();
}

function isAtRisk(ticket: TicketSummary): boolean {
  if (ticket.responseBreached || ticket.resolutionBreached) return false;
  const due = ticket.resolutionDueAt ?? ticket.responseDueAt;
  if (!due) return false;
  const remaining = new Date(due).getTime() - Date.now();
  return remaining > 0 && remaining < AT_RISK_WINDOW_MS;
}

export function AgentDashboard({ user }: { user: UserProfile }) {
  const myTickets = useTickets({
    assignee: 'me',
    status: ['OPEN', 'PENDING', 'ON_HOLD'],
    pageSize: 50,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  const unassigned = useTickets({ assignee: 'unassigned', status: ['OPEN'], pageSize: 1 });
  const showTeamSla = canViewSlaDashboard(user.role.name);
  const slaDashboard = useSlaDashboard({ enabled: showTeamSla });

  const items = myTickets.data?.items ?? [];
  const breachedCount = items.filter((t) => t.responseBreached || t.resolutionBreached).length;
  const dueTodayCount = items.filter((t) => isDueToday(t.resolutionDueAt ?? t.responseDueAt)).length;
  const atRiskCount = items.filter(isAtRisk).length;

  const sortedByUrgency = [...items].sort((a, b) => {
    const dueA = a.resolutionDueAt ?? a.responseDueAt;
    const dueB = b.resolutionDueAt ?? b.responseDueAt;
    if (!dueA) return 1;
    if (!dueB) return -1;
    return new Date(dueA).getTime() - new Date(dueB).getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.firstName}</h1>
        <p className="text-sm text-muted-foreground">Your workload and SLA timers at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Assigned to me"
          value={myTickets.data?.meta.total ?? 0}
          loading={myTickets.isLoading}
          icon={ListTodo}
          iconClassName="text-blue-500"
          href="/dashboard/tickets?assignee=me"
        />
        <StatCard
          label="Due today"
          value={dueTodayCount}
          loading={myTickets.isLoading}
          icon={CalendarClock}
          iconClassName="text-amber-500"
        />
        <StatCard
          label="At risk"
          value={atRiskCount}
          loading={myTickets.isLoading}
          icon={AlertTriangle}
          iconClassName="text-orange-500"
        />
        <StatCard
          label="Breached"
          value={breachedCount}
          loading={myTickets.isLoading}
          icon={AlertTriangle}
          iconClassName="text-red-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">My tickets, by urgency</CardTitle>
            <Link href="/dashboard/tickets?assignee=me" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {myTickets.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : sortedByUrgency.length > 0 ? (
              <div className="divide-y divide-border">
                {sortedByUrgency.slice(0, 8).map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/tickets/${ticket.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="w-10 shrink-0 text-xs text-muted-foreground">#{ticket.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ticket.subject}</p>
                      <SlaCountdown
                        dueAt={ticket.resolutionDueAt ?? ticket.responseDueAt}
                        breached={ticket.responseBreached || ticket.resolutionBreached}
                        paused={!!ticket.slaPausedAt}
                        label="Resolution"
                      />
                    </div>
                    <TicketPriorityBadge priority={ticket.priority} className="shrink-0" />
                    <TicketStatusBadge status={ticket.status} className="shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <CheckCircle2 className="size-8 text-emerald-500" />
                <p className="text-sm font-medium">Nothing on your plate</p>
                <p className="text-sm text-muted-foreground">Pick something up from the unassigned queue.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned queue</CardTitle>
              <Inbox className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {unassigned.isLoading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{unassigned.data?.meta.total ?? 0}</span>
                  <Link href="/dashboard/tickets?assignee=unassigned" className="text-xs text-primary hover:underline">
                    Browse
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">SLA simulator</CardTitle>
              <Timer className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/sla/simulator" className="text-xs text-primary hover:underline">
                Preview due dates for a hypothetical ticket
              </Link>
            </CardContent>
          </Card>

          {showTeamSla && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Team SLA compliance</CardTitle>
              </CardHeader>
              <CardContent>
                {slaDashboard.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">
                      {slaDashboard.data?.complianceRate != null ? `${slaDashboard.data.complianceRate}%` : '—'}
                    </span>
                    <Link href="/dashboard/sla" className="text-xs text-primary hover:underline">
                      Full dashboard
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
