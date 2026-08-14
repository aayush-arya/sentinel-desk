'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Search, User as UserIcon } from 'lucide-react';
import type { UserProfile } from '@sentinel-desk/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar';
import { useLogout } from '@/hooks/use-auth';
import { useUIStore } from '@/store/ui-store';

function initials(user: UserProfile) {
  return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
}

export function DashboardTopbar({ user }: { user: UserProfile }) {
  const router = useRouter();
  const logout = useLogout();
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push('/login');
  };

  return (
    <header className="glass-chrome relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar user={user} />
        <Badge variant="secondary" className="font-normal">
          {user.role.label}
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="mr-1 hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/70 sm:flex"
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="ml-1 rounded border border-border bg-background px-1 font-mono text-[10px]">⌘K</kbd>
        </button>
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-1 rounded-full outline-none ring-offset-background transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Account menu for ${user.firstName} ${user.lastName}`}
          >
            <Avatar className="size-8">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.firstName} />}
              <AvatarFallback>{initials(user)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <UserIcon className="size-4" />
                Profile settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
