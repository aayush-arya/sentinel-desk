'use client';

import { Laptop, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useLogoutAllOthers, useRevokeSession, useSessions } from '@/hooks/use-sessions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-client';

export default function SessionsPage() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const logoutAllOthers = useLogoutAllOthers();

  const handleRevoke = async (id: string) => {
    try {
      await revokeSession.mutateAsync(id);
      toast.success('Session revoked');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to revoke session'));
    }
  };

  const handleLogoutAllOthers = async () => {
    try {
      const result = await logoutAllOthers.mutateAsync();
      toast.success(`Signed out of ${result.revokedCount} other session(s)`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to sign out other sessions'));
    }
  };

  const otherSessionsCount = (sessions?.length ?? 0) - 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Active sessions</h1>
          <p className="text-sm text-muted-foreground">Devices currently signed in to your account.</p>
        </div>
        {otherSessionsCount > 0 && (
          <Button variant="outline" onClick={handleLogoutAllOthers} disabled={logoutAllOthers.isPending}>
            Sign out other sessions
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {sessions?.map((session) => (
          <Card key={session.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <Laptop className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{session.device}</p>
                    {session.isCurrent && <Badge variant="secondary">This device</Badge>}
                    {session.isRememberMe && <Badge variant="outline">Remembered</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress ?? 'Unknown IP'} · last active{' '}
                    {new Date(session.lastUsedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokeSession.isPending}
                >
                  <LogOut className="size-3.5" />
                  Revoke
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && sessions?.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No active sessions</CardTitle>
            <CardDescription>This shouldn&apos;t happen while you&apos;re logged in.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
