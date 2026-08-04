'use client';

import Link from 'next/link';
import { Building2, Mail, Monitor, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSessions } from '@/hooks/use-sessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardOverviewPage() {
  const { data: user } = useCurrentUser();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s on your account today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Role</CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className="text-sm">{user.role.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active sessions</CardTitle>
            <Monitor className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{sessions?.length ?? 0}</span>
                <Link href="/dashboard/sessions" className="text-xs text-primary hover:underline">
                  Manage
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account status</CardTitle>
            <Mail className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-sm">
              {user.status.replace('_', ' ').toLowerCase()}
            </Badge>
          </CardContent>
        </Card>
      </div>

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
  );
}
