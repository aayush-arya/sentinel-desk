'use client';

import { useCurrentUser } from '@/hooks/use-current-user';
import { CustomerDashboard } from '@/components/dashboard/customer-dashboard';
import { AgentDashboard } from '@/components/dashboard/agent-dashboard';
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';

export default function DashboardOverviewPage() {
  const { data: user } = useCurrentUser();

  if (!user) return null;

  switch (user.role.name) {
    case 'CUSTOMER':
      return <CustomerDashboard user={user} />;
    case 'AGENT':
    case 'SENIOR_AGENT':
      return <AgentDashboard user={user} />;
    case 'MANAGER':
      return <ManagerDashboard user={user} />;
    case 'ADMIN':
      return <AdminDashboard user={user} />;
    default:
      return null;
  }
}
