'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitMerge, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { useTickets } from '@/hooks/use-tickets';
import { useMergeTicket } from '@/hooks/use-tickets';
import { getApiErrorMessage } from '@/lib/api-client';

export function MergeDialog({ ticketId, ticketNumber }: { ticketId: string; ticketNumber: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data } = useTickets({ search: search || undefined, pageSize: 8 });
  const merge = useMergeTicket(ticketId);

  const results = (data?.items ?? []).filter((t) => t.id !== ticketId);

  const handleSubmit = async () => {
    if (!selectedId) return;
    try {
      await merge.mutateAsync(selectedId);
      toast.success(`Ticket #${ticketNumber} merged`);
      setOpen(false);
      router.push(`/dashboard/tickets/${selectedId}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to merge ticket'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
          <GitMerge className="size-3.5" />
          Merge into…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge ticket #{ticketNumber}</DialogTitle>
          <DialogDescription>
            This ticket will close and link to the surviving ticket you pick below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by subject…"
            autoFocus
          />
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {results.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedId(ticket.id)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedId === ticket.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <span className="text-xs text-muted-foreground">#{ticket.number}</span>
                <span className="truncate">{ticket.subject}</span>
              </button>
            ))}
            {search && results.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matching tickets</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!selectedId || merge.isPending}>
            {merge.isPending && <Loader2 className="size-4 animate-spin" />}
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
