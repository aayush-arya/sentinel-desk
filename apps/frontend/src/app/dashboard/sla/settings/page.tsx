'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SlaPolicy, TicketPriority } from '@sentinel-desk/types';
import { TICKET_PRIORITY_LABELS } from '@sentinel-desk/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useBusinessHoursSchedules, useSlaPolicies, useUpdateSlaPolicy } from '@/hooks/use-sla';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-client';

const PRIORITY_ORDER: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function describeSlot(slot: { dayOfWeek: number; startMinute: number; endMinute: number }) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `${DAYS[slot.dayOfWeek]} ${fmt(slot.startMinute)}–${fmt(slot.endMinute)}`;
}

interface PolicyFormValues {
  autoEscalateAtPercent: number;
  rules: Record<TicketPriority, { responseTargetMinutes: number; resolutionTargetMinutes: number }>;
}

function PolicyCard({ policy }: { policy: SlaPolicy }) {
  const updatePolicy = useUpdateSlaPolicy(policy.id);

  const defaultValues: PolicyFormValues = {
    autoEscalateAtPercent: policy.autoEscalateAtPercent,
    rules: Object.fromEntries(
      PRIORITY_ORDER.map((p) => {
        const rule = policy.rules.find((r) => r.priority === p);
        return [p, { responseTargetMinutes: rule?.responseTargetMinutes ?? 60, resolutionTargetMinutes: rule?.resolutionTargetMinutes ?? 480 }];
      }),
    ) as PolicyFormValues['rules'],
  };

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<PolicyFormValues>({ defaultValues });

  const onSubmit = async (values: PolicyFormValues) => {
    try {
      await updatePolicy.mutateAsync({
        autoEscalateAtPercent: Number(values.autoEscalateAtPercent),
        rules: PRIORITY_ORDER.map((p) => ({
          priority: p,
          responseTargetMinutes: Number(values.rules[p].responseTargetMinutes),
          resolutionTargetMinutes: Number(values.rules[p].resolutionTargetMinutes),
        })),
      });
      toast.success('SLA policy updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update policy'));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {policy.name}
            {policy.isDefault && <Badge variant="secondary">Default</Badge>}
          </CardTitle>
          <CardDescription>Business hours: {policy.businessHours.name} ({policy.businessHours.timezone})</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`escalate-${policy.id}`}>Auto-escalate at (% of resolution window elapsed)</Label>
            <Input
              id={`escalate-${policy.id}`}
              type="number"
              min={1}
              max={100}
              className="w-32"
              {...register('autoEscalateAtPercent')}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Response target (min)</th>
                  <th className="px-3 py-2">Resolution target (min)</th>
                </tr>
              </thead>
              <tbody>
                {PRIORITY_ORDER.map((p) => (
                  <tr key={p} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{TICKET_PRIORITY_LABELS[p]}</td>
                    <td className="px-3 py-2">
                      <Input type="number" min={1} className="w-28" {...register(`rules.${p}.responseTargetMinutes`)} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min={1} className="w-28" {...register(`rules.${p}.resolutionTargetMinutes`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SlaSettingsPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: schedules, isLoading: schedulesLoading } = useBusinessHoursSchedules();
  const { data: policies, isLoading: policiesLoading } = useSlaPolicies();

  useEffect(() => {
    if (user && user.role.name !== 'ADMIN' && user.role.name !== 'MANAGER') {
      router.replace('/dashboard/sla');
    }
  }, [user, router]);

  if (!user || (user.role.name !== 'ADMIN' && user.role.name !== 'MANAGER')) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SLA settings</h1>
        <p className="text-sm text-muted-foreground">Business hours and per-priority response/resolution targets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedulesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            schedules?.map((schedule) => (
              <div key={schedule.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{schedule.name}</p>
                  {schedule.isDefault && <Badge variant="secondary">Default</Badge>}
                  <span className="text-xs text-muted-foreground">{schedule.timezone}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {schedule.slots.map(describeSlot).join(' · ')}
                </p>
                {schedule.holidays.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Holidays: {schedule.holidays.map((h) => h.name).join(', ')}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {policiesLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        policies?.map((policy) => <PolicyCard key={policy.id} policy={policy} />)
      )}
    </div>
  );
}
