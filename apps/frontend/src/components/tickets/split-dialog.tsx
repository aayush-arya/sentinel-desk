'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketComment } from '@sentinel-desk/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSplitTicket } from '@/hooks/use-tickets';
import { getApiErrorMessage } from '@/lib/api-client';

export function SplitDialog({
  ticketId,
  ticketNumber,
  comments,
}: {
  ticketId: string;
  ticketNumber: number;
  comments: TicketComment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const split = useSplitTicket(ticketId);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!subject.trim() || selected.length === 0) {
      toast.error('Give the new ticket a subject and pick at least one message');
      return;
    }
    try {
      const newTicket = await split.mutateAsync({ subject, commentIds: selected });
      toast.success(`Created ticket #${newTicket.number}`);
      setOpen(false);
      router.push(`/dashboard/tickets/${newTicket.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to split ticket'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
          <Scissors className="size-3.5" />
          Split off…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split ticket #{ticketNumber}</DialogTitle>
          <DialogDescription>Copy selected messages onto a brand-new ticket.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="split-subject">New ticket subject</Label>
            <Input
              id="split-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Separate billing question"
            />
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {comments.map((comment) => (
              <label
                key={comment.id}
                className="flex items-start gap-2 rounded-lg border border-border p-2.5 text-sm"
              >
                <Checkbox
                  checked={selected.includes(comment.id)}
                  onCheckedChange={() => toggle(comment.id)}
                  className="mt-0.5"
                />
                <span className="line-clamp-2 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {comment.author.firstName}:
                  </span>{' '}
                  {comment.body.replace(/<[^>]+>/g, ' ').trim()}
                </span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={split.isPending}>
            {split.isPending && <Loader2 className="size-4 animate-spin" />}
            Create split ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
