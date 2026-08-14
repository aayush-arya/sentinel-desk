import {
  BarChart3,
  BookOpen,
  Gauge,
  LayoutGrid,
  MessageSquare,
  MessagesSquare,
  Monitor,
  Users,
} from 'lucide-react';
import type { UserProfile } from '@sentinel-desk/types';
import { canManageTeam, canViewSlaDashboard } from '@/lib/rbac';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Shared by the desktop sidebar and the mobile drawer so role-based visibility
// (SLA/analytics/team) only has one place to get right.
export function getNavItems(user: UserProfile): NavItem[] {
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
    { href: '/dashboard/tickets', label: 'Tickets', icon: MessageSquare },
    { href: '/dashboard/knowledge-base', label: 'Knowledge base', icon: BookOpen },
    { href: '/dashboard/sessions', label: 'Sessions', icon: Monitor },
  ];
  if (user.role.name !== 'CUSTOMER') {
    items.splice(3, 0, { href: '/dashboard/macros', label: 'Saved replies', icon: MessagesSquare });
  }
  if (canViewSlaDashboard(user.role.name)) {
    items.splice(2, 0, { href: '/dashboard/sla', label: 'SLA', icon: Gauge });
    items.splice(2, 0, { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 });
  }
  if (canManageTeam(user.role.name)) {
    items.splice(2, 0, { href: '/dashboard/team', label: 'Team', icon: Users });
  }
  return items;
}
