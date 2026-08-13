'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Star } from 'lucide-react';
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@sentinel-desk/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAnalyticsOverview } from '@/hooks/use-analytics';
import { canViewSlaDashboard } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'var(--chart-1)',
  PENDING: 'var(--chart-4)',
  ON_HOLD: 'var(--chart-3)',
  RESOLVED: 'var(--chart-5)',
  CLOSED: 'var(--chart-2)',
};

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAnalyticsOverview(days);

  useEffect(() => {
    if (user && !canViewSlaDashboard(user.role.name)) router.replace('/dashboard');
  }, [user, router]);

  if (!user || !canViewSlaDashboard(user.role.name)) return null;

  const volume = data?.volume.map((v) => ({ ...v, label: formatDate(v.date) })) ?? [];
  const responseTime = data?.responseTime.map((v) => ({ ...v, label: formatDate(v.date) })) ?? [];
  const statusBreakdown =
    data?.statusBreakdown
      .filter((s) => s.count > 0)
      .map((s) => ({ name: TICKET_STATUS_LABELS[s.status], value: s.count, key: s.status })) ?? [];
  const priorityBreakdown =
    data?.priorityBreakdown.map((p) => ({ name: TICKET_PRIORITY_LABELS[p.priority], value: p.count })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Ticket volume, response times, and breakdowns.</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Customer satisfaction</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : data?.avgCsat != null ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`size-4 ${n <= Math.round(data.avgCsat!) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
              <span className="text-lg font-semibold">{data.avgCsat.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                from {data.csatResponseCount} rating{data.csatResponseCount === 1 ? '' : 's'} in this window
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No customer ratings in this window yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket volume</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={volume} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="created" name="Created" stroke="var(--chart-1)" fill="url(#createdGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="var(--chart-5)" fill="url(#resolvedGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Response &amp; resolution time</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={responseTime} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  label={{ value: 'minutes', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="avgResponseMinutes"
                  name="Avg first response"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="avgResolutionMinutes"
                  name="Avg resolution"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? 'var(--chart-1)'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No tickets yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityBreakdown} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]}>
                    {priorityBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
