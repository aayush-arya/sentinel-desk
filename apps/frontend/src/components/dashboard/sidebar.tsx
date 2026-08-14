'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { UserProfile } from '@sentinel-desk/types';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getNavItems } from '@/lib/dashboard-nav';
import { useUIStore } from '@/store/ui-store';

export function DashboardSidebar({ user }: { user: UserProfile }) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navItems = getNavItems(user);

  return (
    <aside
      className={cn(
        'glass-chrome relative z-20 hidden shrink-0 flex-col border-r border-border/60 transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && <BrandLogo logoUrl={user.organization.logoUrl} />}
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
                'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon className="relative z-10 size-4 shrink-0" />
              {/* Plain CSS transition rather than framer-motion here: collapse is a
                  binary toggle between two known states, and max-width + opacity
                  gives the same smooth reveal/hide without needing JS to measure
                  the label's natural width. */}
              <span
                className={cn(
                  'relative z-10 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150',
                  collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100',
                )}
              >
                {item.label}
              </span>
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
