'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Pencil, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useTicket, useTicketHistory, useUpdateTicket, useReopenTicket } from '@/hooks/use-tickets';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/tickets/ticket-badges';
import { CommentThread } from '@/components/tickets/comment-thread';
import { ReplyComposer } from '@/components/tickets/reply-composer';
import { TicketSidebar } from '@/components/tickets/ticket-sidebar';
import { EscalateDialog } from '@/components/tickets/escalate-dialog';
import { MergeDialog } from '@/components/tickets/merge-dialog';
import { SplitDialog } from '@/components/tickets/split-dialog';
import { HistoryTimeline } from '@/components/tickets/history-timeline';
import { getApiErrorMessage } from '@/lib/api-client';

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: user } = useCurrentUser();
  const { data: ticket, isLoading } = useTicket(params.id);
  const { data: history } = useTicketHistory(params.id);
  const updateTicket = useUpdateTicket(params.id);
  const reopenTicket = useReopenTicket(params.id);

  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState('');

  if (isLoading || !ticket || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isStaff = user.role.name !== 'CUSTOMER';
  const isClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const canEditSubject = isStaff || ticket.status === 'OPEN' || ticket.status === 'PENDING';

  const saveSubject = async () => {
    if (!subjectDraft.trim() || subjectDraft === ticket.subject) {
      setEditingSubject(false);
      return;
    }
    try {
      await updateTicket.mutateAsync({ subject: subjectDraft });
      setEditingSubject(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update subject'));
    }
  };

  const handleReopen = async () => {
    try {
      await reopenTicket.mutateAsync();
      toast.success('Ticket reopened');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to reopen ticket'));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Ticket #{ticket.number}</p>
          {editingSubject ? (
            <div className="mt-1 flex items-center gap-2">
              <Input
                value={subjectDraft}
                onChange={(e) => setSubjectDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveSubject()}
                autoFocus
                className="text-lg font-semibold"
              />
              <Button size="sm" onClick={saveSubject}>
                Save
              </Button>
            </div>
          ) : (
            <div className="group mt-0.5 flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
              {canEditSubject && (
                <button
                  type="button"
                  onClick={() => {
                    setSubjectDraft(ticket.subject);
                    setEditingSubject(true);
                  }}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Edit subject"
                >
                  <Pencil className="size-4" />
                </button>
              )}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            {ticket.reopenedCount > 0 && (
              <span className="text-xs text-muted-foreground">Reopened {ticket.reopenedCount}x</span>
            )}
          </div>
        </div>

        <Tabs defaultValue="conversation">
          <TabsList>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="conversation" className="space-y-4">
            <Card className="p-4">
              <CommentThread comments={ticket.comments} />
            </Card>
            {isClosed && (
              <Button variant="outline" size="sm" onClick={handleReopen} disabled={reopenTicket.isPending}>
                {reopenTicket.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Reopen ticket
              </Button>
            )}
            <ReplyComposer ticketId={ticket.id} isStaff={isStaff} willReopen={isClosed} />
          </TabsContent>
          <TabsContent value="history">
            <Card className="p-4">
              {history ? <HistoryTimeline entries={history} /> : <Skeleton className="h-32 w-full" />}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <TicketSidebar ticket={ticket} isStaff={isStaff} />
        </Card>

        {isStaff && (
          <Card className="space-y-1.5 p-3">
            <EscalateDialog ticketId={ticket.id} />
            <MergeDialog ticketId={ticket.id} ticketNumber={ticket.number} />
            <SplitDialog ticketId={ticket.id} ticketNumber={ticket.number} comments={ticket.comments} />
          </Card>
        )}
      </div>
    </div>
  );
}
