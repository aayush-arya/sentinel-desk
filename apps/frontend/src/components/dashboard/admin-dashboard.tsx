import Link from 'next/link';
import { Activity, BarChart3, Building2, Database, ScrollText, Server, Settings, TicketIcon, Users } from 'lucide-react';
import type { RoleName, UserProfile } from '@sentinel-desk/types';
import { ROLE_LABELS } from '@sentinel-desk/types';
import { useOrgMembers } from '@/hooks/use-team';
import { useTickets } from '@/hooks/use-tickets';
import { useSystemHealth } from '@/hooks/use-health';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';

export function AdminDashboard({ user }: { user: UserProfile }) {
  const orgMembers = useOrgMembers();
  const allTickets = useTickets({ pageSize: 1 });
  const health = useSystemHealth();

  const roleCounts = (() => {
    const counts = new Map<RoleName, number>();
    for (const member of orgMembers.data ?? []) {
      counts.set(member.role, (counts.get(member.role) ?? 0) + 1);
    }
    return counts;
  })();

  const dbUp = health.data?.info?.database?.status === 'up';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.firstName}</h1>
          <p className="text-sm text-muted-foreground">Organization, users, and system status.</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-sm">
          <span className={`size-1.5 rounded-full ${dbUp ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {health.isLoading ? 'Checking…' : dbUp ? 'All systems operational' : 'Degraded'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={orgMembers.data?.length ?? 0}
          loading={orgMembers.isLoading}
          icon={Users}
          iconClassName="text-blue-500"
          href="/dashboard/team"
        />
        <StatCard
          label="Total tickets"
          value={allTickets.data?.meta.total ?? 0}
          loading={allTickets.isLoading}
          icon={TicketIcon}
          iconClassName="text-violet-500"
          href="/dashboard/tickets"
        />
        <StatCard
          label="Database"
          value={health.isLoading ? '—' : dbUp ? 'Up' : 'Down'}
          loading={health.isLoading}
          icon={Database}
          iconClassName={dbUp ? 'text-emerald-500' : 'text-red-500'}
        />
        <StatCard
          label="SLA policies"
          value="Configured"
          icon={Settings}
          iconClassName="text-amber-500"
          href="/dashboard/sla/settings"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Users by role</CardTitle>
            <Link href="/dashboard/team" className="text-xs text-primary hover:underline">
              Manage team
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {orgMembers.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              (Object.keys(ROLE_LABELS) as RoleName[]).map((role) => (
                <div key={role} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                  <span className="text-sm">{ROLE_LABELS[role]}</span>
                  <span className="text-sm font-semibold">{roleCounts.get(role) ?? 0}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{user.organization.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Workspace slug</p>
              <p className="text-sm font-medium">{user.organization.slug}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Timezone</p>
              <p className="text-sm font-medium">{user.organization.timezone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="text-sm font-medium">
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/team"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Users className="size-3.5" /> Team &amp; roles
          </Link>
          <Link
            href="/dashboard/sla/settings"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Settings className="size-3.5" /> SLA policies
          </Link>
          <Link
            href="/dashboard/sla"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Server className="size-3.5" /> SLA dashboard
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <BarChart3 className="size-3.5" /> Analytics
          </Link>
          <Link
            href="/dashboard/audit-logs"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <ScrollText className="size-3.5" /> Audit log
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
