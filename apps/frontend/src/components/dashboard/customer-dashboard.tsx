import Link from 'next/link';
import { Bell, CheckCircle2, MessageSquare, Plus, TicketIcon } from 'lucide-react';
import type { UserProfile } from '@sentinel-desk/types';
import { useTickets } from '@/hooks/use-tickets';
import { useNotifications } from '@/hooks/use-notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/tickets/ticket-badges';
import { StatCard } from '@/components/dashboard/stat-card';

const OPEN_STATUSES = ['OPEN', 'PENDING', 'ON_HOLD'] as const;
const CLOSED_STATUSES = ['RESOLVED', 'CLOSED'] as const;

export function CustomerDashboard({ user }: { user: UserProfile }) {
  const openTickets = useTickets({ status: [...OPEN_STATUSES], pageSize: 1 });
  const resolvedTickets = useTickets({ status: [...CLOSED_STATUSES], pageSize: 1 });
  const recentTickets = useTickets({ pageSize: 5, sortBy: 'updatedAt', sortOrder: 'desc' });
  const { data: notifications, isLoading: notificationsLoading } = useNotifications();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.firstName}</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s the status of your support requests.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tickets/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open requests"
          value={openTickets.data?.meta.total ?? 0}
          loading={openTickets.isLoading}
          icon={TicketIcon}
          iconClassName="text-blue-500"
          href="/dashboard/tickets?status=OPEN"
        />
        <StatCard
          label="Resolved"
          value={resolvedTickets.data?.meta.total ?? 0}
          loading={resolvedTickets.isLoading}
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
          href="/dashboard/tickets?status=RESOLVED"
        />
        <StatCard
          label="Unread notifications"
          value={notifications?.unreadCount ?? 0}
          loading={notificationsLoading}
          icon={Bell}
          iconClassName="text-amber-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent tickets</CardTitle>
            <Link href="/dashboard/tickets" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentTickets.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTickets.data && recentTickets.data.items.length > 0 ? (
              <div className="divide-y divide-border">
                {recentTickets.data.items.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/tickets/${ticket.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="w-10 shrink-0 text-xs text-muted-foreground">#{ticket.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ticket.subject}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="size-3" />
                        {ticket.commentCount} {ticket.commentCount === 1 ? 'reply' : 'replies'}
                      </p>
                    </div>
                    <TicketPriorityBadge priority={ticket.priority} className="shrink-0" />
                    <TicketStatusBadge status={ticket.status} className="shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <TicketIcon className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No tickets yet</p>
                <p className="text-sm text-muted-foreground">Create one if you need a hand with something.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {notificationsLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : notifications && notifications.items.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.items.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{notification.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <Bell className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
