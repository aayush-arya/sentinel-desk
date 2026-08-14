'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import type { AppNotification } from '@sentinel-desk/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationRow({ notification, index }: { notification: AppNotification; index: number }) {
  const markRead = useMarkNotificationRead();
  const unread = !notification.readAt;

  const content = (
    <div
      // CSS-driven stagger (tw-animate-css's animate-in, not framer-motion) —
      // reliably fires regardless of the animation engine backing it, and a
      // fresh notification list is exactly the "communicates new state" case
      // this kind of subtle entrance is for.
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, animationFillMode: 'backwards' }}
      className={cn(
        'flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors animate-in fade-in-0 slide-in-from-top-1 duration-200 hover:bg-muted/60',
        unread && 'bg-primary/5',
      )}
      onClick={() => unread && markRead.mutate(notification.id)}
    >
      <div className="flex items-center gap-2">
        {unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
        <p className="min-w-0 flex-1 truncate font-medium">{notification.title}</p>
      </div>
      <p className="truncate text-xs text-muted-foreground">{notification.body}</p>
      <p className="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
    </div>
  );

  if (notification.ticketId) {
    return <Link href={`/dashboard/tickets/${notification.ticketId}`}>{content}</Link>;
  }
  return content;
}

export function NotificationBell() {
  const { data } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <p className="text-sm font-medium">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="size-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {data && data.items.length > 0 ? (
            <div className="space-y-0.5">
              {data.items.map((n, i) => (
                <NotificationRow key={n.id} notification={n} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Bell} title="You're all caught up" size="compact" />
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
