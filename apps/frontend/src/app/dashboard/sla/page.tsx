'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Gauge, Settings, Timer, TrendingUp } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSlaDashboard, useSlaViolations } from '@/hooks/use-sla';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/tickets/ticket-badges';

const DASHBOARD_ROLES = ['SENIOR_AGENT', 'MANAGER', 'ADMIN'];

export default function SlaDashboardPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: summary, isLoading: summaryLoading } = useSlaDashboard();
  const { data: violations, isLoading: violationsLoading } = useSlaViolations();

  useEffect(() => {
    if (user && !DASHBOARD_ROLES.includes(user.role.name)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !DASHBOARD_ROLES.includes(user.role.name)) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SLA Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time compliance across all active tickets.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/sla/simulator">
              <Timer className="size-3.5" />
              Simulator
            </Link>
          </Button>
          {(user.role.name === 'ADMIN' || user.role.name === 'MANAGER') && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/sla/settings">
                <Settings className="size-3.5" />
                Configure
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On track</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? <Skeleton className="h-8 w-12" /> : (
              <span className="text-2xl font-semibold">{summary?.onTrack ?? 0}</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">At risk</CardTitle>
            <Gauge className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? <Skeleton className="h-8 w-12" /> : (
              <span className="text-2xl font-semibold">{summary?.atRisk ?? 0}</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Breached</CardTitle>
            <AlertTriangle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? <Skeleton className="h-8 w-12" /> : (
              <span className="text-2xl font-semibold">{summary?.breached ?? 0}</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">30-day compliance</CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-2xl font-semibold">
                {summary?.complianceRate != null ? `${summary.complianceRate}%` : '—'}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Violations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {violationsLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : violations && violations.items.length > 0 ? (
            <div className="divide-y divide-border">
              {violations.items.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/dashboard/tickets/${ticket.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
                >
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">#{ticket.number}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.responseBreached && 'Response breached'}
                      {ticket.responseBreached && ticket.resolutionBreached && ' · '}
                      {ticket.resolutionBreached && 'Resolution breached'}
                    </p>
                  </div>
                  <TicketPriorityBadge priority={ticket.priority} className="shrink-0" />
                  <TicketStatusBadge status={ticket.status} className="shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <p className="text-sm font-medium">No violations</p>
              <p className="text-sm text-muted-foreground">Every ticket is within its SLA window.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
