'use client';

import { useState } from 'react';
import { ArrowUpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssignableAgents } from '@/hooks/use-agents';
import { useEscalateTicket } from '@/hooks/use-tickets';
import { getApiErrorMessage } from '@/lib/api-client';

export function EscalateDialog({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const { data: agents } = useAssignableAgents();
  const escalate = useEscalateTicket(ticketId);

  const handleSubmit = async () => {
    if (reason.trim().length < 3) {
      toast.error('Please explain why this needs escalation');
      return;
    }
    try {
      await escalate.mutateAsync({
        reason,
        newAssigneeId: newAssigneeId || undefined,
        priority: 'URGENT',
      });
      toast.success('Ticket escalated');
      setOpen(false);
      setReason('');
      setNewAssigneeId('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to escalate ticket'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
          <ArrowUpCircle className="size-3.5" />
          Escalate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate ticket</DialogTitle>
          <DialogDescription>Bumps priority to Urgent and optionally reassigns.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why does this need escalation?"
            />
          </div>
          <div className="space-y-2">
            <Label>Reassign to (optional)</Label>
            <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Keep current assignee" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={escalate.isPending}>
            {escalate.isPending && <Loader2 className="size-4 animate-spin" />}
            Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
