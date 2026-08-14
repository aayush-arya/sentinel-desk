'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gauge, Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketPriority } from '@sentinel-desk/types';
import { TICKET_PRIORITY_LABELS } from '@sentinel-desk/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSimulateSla } from '@/hooks/use-sla';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api-client';

const STAFF_ROLES = ['AGENT', 'SENIOR_AGENT', 'MANAGER', 'ADMIN'];

// datetime-local has no timezone info of its own - treat the value as wall-clock
// local time, which is what a staff member picking "tomorrow at 9am" actually means.
function toLocalDatetimeInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function SlaSimulatorPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const simulate = useSimulateSla();

  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [from, setFrom] = useState(() => toLocalDatetimeInputValue(new Date()));

  useEffect(() => {
    if (user && !STAFF_ROLES.includes(user.role.name)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !STAFF_ROLES.includes(user.role.name)) return null;

  const handleSimulate = async () => {
    try {
      await simulate.mutateAsync({
        priority,
        from: from ? new Date(from).toISOString() : undefined,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to run simulation'));
    }
  };

  const result = simulate.data;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SLA simulator</h1>
        <p className="text-sm text-muted-foreground">
          Preview response and resolution due dates for a hypothetical ticket, using your organization&apos;s
          default SLA policy and business hours.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {TICKET_PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sim-from">Hypothetical creation time</Label>
            <Input
              id="sim-from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <Button onClick={handleSimulate} disabled={simulate.isPending} className="gap-1.5">
            {simulate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Gauge className="size-4" />}
            Run simulation
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Timer className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!result.policyName ? (
              <p className="text-sm text-muted-foreground">
                No default SLA policy is configured for your organization.
              </p>
            ) : !result.responseDueAt ? (
              <p className="text-sm text-muted-foreground">
                &quot;{result.policyName}&quot; has no rule defined for {TICKET_PRIORITY_LABELS[priority]} priority.
              </p>
            ) : (
              <>
                <div className="rounded-lg bg-muted/50 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground">Policy</p>
                  <p className="text-sm font-medium">{result.policyName}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 px-4 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      Response due ({result.responseTargetMinutes} min target)
                    </p>
                    <p className="text-sm font-medium">
                      {new Date(result.responseDueAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-4 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      Resolution due ({result.resolutionTargetMinutes} min target)
                    </p>
                    <p className="text-sm font-medium">
                      {result.resolutionDueAt &&
                        new Date(result.resolutionDueAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
