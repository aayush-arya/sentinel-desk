'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ROLE_LABELS, type RoleName } from '@sentinel-desk/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrgMembers, useUpdateMember } from '@/hooks/use-team';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteMemberDialog } from '@/components/dashboard/invite-member-dialog';
import { canManageTeam, grantableRoles } from '@/lib/rbac';
import { getApiErrorMessage } from '@/lib/api-client';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  ACTIVE: 'default',
  INVITED: 'secondary',
  PENDING_VERIFICATION: 'secondary',
  SUSPENDED: 'destructive',
  DEACTIVATED: 'outline',
};

export default function TeamPage() {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { data: members, isLoading } = useOrgMembers();
  const updateMember = useUpdateMember();

  useEffect(() => {
    if (currentUser && !canManageTeam(currentUser.role.name)) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  if (!currentUser || !canManageTeam(currentUser.role.name)) return null;

  const roles = grantableRoles(currentUser.role.name);

  const handleRoleChange = async (memberId: string, role: RoleName) => {
    try {
      await updateMember.mutateAsync({ id: memberId, role });
      toast.success('Role updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update role'));
    }
  };

  const handleToggleStatus = async (memberId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await updateMember.mutateAsync({ id: memberId, status: nextStatus });
      toast.success(nextStatus === 'SUSPENDED' ? 'Member suspended' : 'Member reactivated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update status'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Manage who has access to {currentUser.organization.name}.</p>
        </div>
        <InviteMemberDialog actorRole={currentUser.role.name} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members?.map((member) => {
                const isSelf = member.id === currentUser.id;
                const canEditRole = !isSelf && roles.length > 0;
                return (
                  <div key={member.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback>
                          {member.firstName[0]}
                          {member.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.firstName} {member.lastName}
                          {isSelf && <span className="text-muted-foreground"> (you)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={STATUS_VARIANT[member.status] ?? 'outline'} className="capitalize">
                        {member.status.replace('_', ' ').toLowerCase()}
                      </Badge>

                      {canEditRole ? (
                        <Select
                          value={member.role}
                          onValueChange={(role) => handleRoleChange(member.id, role as RoleName)}
                        >
                          <SelectTrigger className="w-40" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[member.role, ...roles.filter((r) => r !== member.role)].map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                      )}

                      {!isSelf && roles.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(member.id, member.status)}
                        >
                          {member.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
