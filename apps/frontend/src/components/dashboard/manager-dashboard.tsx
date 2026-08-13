import Link from 'next/link';
import { AlertTriangle, CheckCircle2, TicketIcon, TrendingUp, Trophy, Users } from 'lucide-react';
import type { UserProfile } from '@sentinel-desk/types';
import { useTickets } from '@/hooks/use-tickets';
import { useSlaDashboard, useSlaViolations } from '@/hooks/use-sla';
import { useOrgMembers } from '@/hooks/use-team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatCard } from '@/components/dashboard/stat-card';

const OPEN_STATUSES = ['OPEN', 'PENDING', 'ON_HOLD'] as const;

export function ManagerDashboard({ user }: { user: UserProfile }) {
  const activeTickets = useTickets({ status: [...OPEN_STATUSES], pageSize: 1 });
  const recentlyResolved = useTickets({
    status: ['RESOLVED', 'CLOSED'],
    pageSize: 100,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  const slaDashboard = useSlaDashboard();
  const violations = useSlaViolations();
  const orgMembers = useOrgMembers();

  const agents = (orgMembers.data ?? []).filter((m) => m.role !== 'CUSTOMER');

  const leaderboard = (() => {
    const counts = new Map<string, { name: string; avatarUrl: string | null; count: number }>();
    for (const ticket of recentlyResolved.data?.items ?? []) {
      if (!ticket.assignee) continue;
      const key = ticket.assignee.id;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else
        counts.set(key, {
          name: `${ticket.assignee.firstName} ${ticket.assignee.lastName}`,
          avatarUrl: ticket.assignee.avatarUrl,
          count: 1,
        });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const responseViolations = (violations.data?.items ?? []).filter((v) => v.responseBreached).length;
  const resolutionViolations = (violations.data?.items ?? []).filter((v) => v.resolutionBreached).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.firstName}</h1>
        <p className="text-sm text-muted-foreground">Team performance and SLA compliance across the organization.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active tickets"
          value={activeTickets.data?.meta.total ?? 0}
          loading={activeTickets.isLoading}
          icon={TicketIcon}
          iconClassName="text-blue-500"
          href="/dashboard/tickets"
        />
        <StatCard
          label="SLA compliance (30d)"
          value={slaDashboard.data?.complianceRate != null ? `${slaDashboard.data.complianceRate}%` : '—'}
          loading={slaDashboard.isLoading}
          icon={TrendingUp}
          iconClassName="text-emerald-500"
          href="/dashboard/sla"
        />
        <StatCard
          label="Breached tickets"
          value={slaDashboard.data?.breached ?? 0}
          loading={slaDashboard.isLoading}
          icon={AlertTriangle}
          iconClassName="text-red-500"
          href="/dashboard/sla"
        />
        <StatCard
          label="Team size"
          value={agents.length}
          loading={orgMembers.isLoading}
          icon={Users}
          iconClassName="text-violet-500"
          href="/dashboard/team"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            <CardTitle className="text-base">Top resolvers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentlyResolved.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="divide-y divide-border">
                {leaderboard.map((agent, i) => (
                  <div key={agent.name + i} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-5 shrink-0 text-sm font-medium text-muted-foreground">{i + 1}</span>
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {agent.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{agent.name}</span>
                    <span className="text-sm text-muted-foreground">{agent.count} resolved</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">No resolved tickets yet.</p>
            )}
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Based on the most recently closed tickets.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Escalation overview</CardTitle>
            <Link href="/dashboard/sla" className="text-xs text-primary hover:underline">
              View violations
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {violations.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <span className="text-sm">Response SLA violations</span>
                  <span className="text-lg font-semibold">{responseViolations}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <span className="text-sm">Resolution SLA violations</span>
                  <span className="text-lg font-semibold">{resolutionViolations}</span>
                </div>
                {responseViolations === 0 && resolutionViolations === 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    No active violations.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
