'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, Gauge, LayoutGrid, MessageSquare, Monitor, PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react';
import type { UserProfile } from '@sentinel-desk/types';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { canManageTeam, canViewSlaDashboard } from '@/lib/rbac';
import { useUIStore } from '@/store/ui-store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getNavItems(user: UserProfile): NavItem[] {
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
    { href: '/dashboard/tickets', label: 'Tickets', icon: MessageSquare },
    { href: '/dashboard/knowledge-base', label: 'Knowledge base', icon: BookOpen },
    { href: '/dashboard/sessions', label: 'Sessions', icon: Monitor },
  ];
  if (canViewSlaDashboard(user.role.name)) {
    items.splice(2, 0, { href: '/dashboard/sla', label: 'SLA', icon: Gauge });
    items.splice(2, 0, { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 });
  }
  if (canManageTeam(user.role.name)) {
    items.splice(2, 0, { href: '/dashboard/team', label: 'Team', icon: Users });
  }
  return items;
}

export function DashboardSidebar({ user }: { user: UserProfile }) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navItems = getNavItems(user);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && <BrandLogo />}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active =
            item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        {!collapsed && <p className="truncate">{user.organization.name}</p>}
      </div>
    </aside>
  );
}
