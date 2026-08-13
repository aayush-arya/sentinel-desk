'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Copy, Loader2, Pencil, RotateCcw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketComment, TicketCommentNewEvent, TicketDetail, TicketTypingEvent } from '@sentinel-desk/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useTicket, useTicketHistory, useUpdateTicket, useReopenTicket, TICKET_KEY } from '@/hooks/use-tickets';
import { useTicketSummary, useDuplicateCandidates, useKbSuggestions } from '@/hooks/use-ai';
import { useRealtime } from '@/lib/realtime-context';
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
import { CsatRating } from '@/components/tickets/csat-rating';
import { getApiErrorMessage } from '@/lib/api-client';

// A stopped/dropped connection can miss a `typing:stop` event — this bounds how
// long a stale "is typing" indicator can survive without one.
const TYPING_STALE_MS = 5_000;

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: user } = useCurrentUser();
  const { data: ticket, isLoading } = useTicket(params.id);
  const { data: history } = useTicketHistory(params.id);
  const updateTicket = useUpdateTicket(params.id);
  const reopenTicket = useReopenTicket(params.id);
  const summarize = useTicketSummary(params.id);
  const duplicates = useDuplicateCandidates(params.id);
  const kbSuggestions = useKbSuggestions(params.id);
  const { socket } = useRealtime();
  const queryClient = useQueryClient();

  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [showSummary, setShowSummary] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showKbSuggestions, setShowKbSuggestions] = useState(false);

  useEffect(() => {
    const ticketId = params.id;
    if (!socket || !ticketId) return;

    // Re-join on every (re)connect, not just on mount — a dropped connection (server
    // restart, sleep/wake, flaky network) rejoins the org/user rooms automatically
    // server-side, but ticket rooms are only joined on explicit request.
    const joinRoom = () => socket.emit('ticket:join', { ticketId });
    joinRoom();
    socket.on('connect', joinRoom);

    const clearTypingTimeout = (userId: string) => {
      const existing = typingTimeoutsRef.current.get(userId);
      if (existing) clearTimeout(existing);
      typingTimeoutsRef.current.delete(userId);
    };

    const handleComment = (event: TicketCommentNewEvent) => {
      if (event.ticketId !== ticketId) return;
      queryClient.setQueryData<TicketDetail>(TICKET_KEY(ticketId), (prev) => {
        if (!prev) return prev;
        if (prev.comments.some((c) => c.id === event.comment.id)) return prev;
        const newComment: TicketComment = {
          id: event.comment.id,
          ticketId,
          authorId: event.comment.author.id,
          visibility: event.comment.visibility,
          body: event.comment.body,
          createdAt: event.comment.createdAt,
          editedAt: null,
          // Sentiment is computed asynchronously after creation (see ai.service.ts) —
          // never available yet on this initial push; the eventual ticket:updated
          // refetch fills it in once ready.
          sentiment: null,
          author: event.comment.author,
          attachments: [],
        };
        return { ...prev, comments: [...prev.comments, newComment] };
      });
      clearTypingTimeout(event.comment.author.id);
      setTypingUserIds((prev) => {
        if (!prev.has(event.comment.author.id)) return prev;
        const next = new Set(prev);
        next.delete(event.comment.author.id);
        return next;
      });
    };

    const handleTyping = (event: TicketTypingEvent) => {
      if (event.ticketId !== ticketId) return;
      clearTypingTimeout(event.userId);
      if (event.isTyping) {
        setTypingUserIds((prev) => new Set(prev).add(event.userId));
        typingTimeoutsRef.current.set(
          event.userId,
          setTimeout(() => {
            typingTimeoutsRef.current.delete(event.userId);
            setTypingUserIds((prev) => {
              const next = new Set(prev);
              next.delete(event.userId);
              return next;
            });
          }, TYPING_STALE_MS),
        );
      } else {
        setTypingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(event.userId);
          return next;
        });
      }
    };

    socket.on('ticket:comment:new', handleComment);
    socket.on('ticket:typing', handleTyping);

    return () => {
      socket.off('connect', joinRoom);
      socket.emit('ticket:leave', { ticketId });
      socket.off('ticket:comment:new', handleComment);
      socket.off('ticket:typing', handleTyping);
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      setTypingUserIds(new Set());
    };
  }, [socket, params.id, queryClient]);

  const typingLabel = (() => {
    if (typingUserIds.size === 0 || !ticket) return null;
    const names = [ticket.requester, ticket.assignee]
      .filter((person): person is NonNullable<typeof person> => !!person && typingUserIds.has(person.id))
      .map((person) => person.firstName);
    if (names.length > 0) return `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} typing…`;
    return 'Someone is typing…';
  })();

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

        {isStaff && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                setShowSummary(true);
                summarize.mutate();
              }}
              disabled={summarize.isPending}
            >
              {summarize.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Summarize
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                setShowDuplicates(true);
                duplicates.mutate();
              }}
              disabled={duplicates.isPending}
            >
              {duplicates.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
              Check duplicates
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                setShowKbSuggestions(true);
                kbSuggestions.mutate();
              }}
              disabled={kbSuggestions.isPending}
            >
              {kbSuggestions.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <BookOpen className="size-3.5" />
              )}
              Suggest articles
            </Button>
          </div>
        )}

        {showSummary && (
          <Card className="space-y-1.5 p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" />
                AI summary
              </p>
              <button type="button" onClick={() => setShowSummary(false)} aria-label="Dismiss summary">
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            {summarize.isPending ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <p className="text-sm">{summarize.data?.summary ?? 'No summary available yet.'}</p>
            )}
          </Card>
        )}

        {showDuplicates && (
          <Card className="space-y-1.5 p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Copy className="size-3.5" />
                Possible duplicates
              </p>
              <button type="button" onClick={() => setShowDuplicates(false)} aria-label="Dismiss duplicates">
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            {duplicates.isPending ? (
              <Skeleton className="h-4 w-full" />
            ) : duplicates.data?.candidates.length ? (
              <ul className="space-y-1.5">
                {duplicates.data.candidates.map((c) => (
                  <li key={c.ticketId} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/dashboard/tickets/${c.ticketId}`} className="truncate hover:underline">
                      #{c.ticketNumber} {c.subject}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {Math.round(c.confidence * 100)}% match
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No likely duplicates found among recent open tickets.</p>
            )}
          </Card>
        )}

        {showKbSuggestions && (
          <Card className="space-y-1.5 p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <BookOpen className="size-3.5" />
                Suggested articles
              </p>
              <button type="button" onClick={() => setShowKbSuggestions(false)} aria-label="Dismiss suggestions">
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            {kbSuggestions.isPending ? (
              <Skeleton className="h-4 w-full" />
            ) : kbSuggestions.data?.suggestions.length ? (
              <ul className="space-y-1.5">
                {kbSuggestions.data.suggestions.map((s) => (
                  <li key={s.articleId} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/dashboard/knowledge-base/${s.articleId}`} className="truncate hover:underline">
                      {s.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">{Math.round(s.confidence * 100)}% match</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No relevant articles found in the knowledge base.</p>
            )}
          </Card>
        )}

        <Tabs defaultValue="conversation">
          <TabsList>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="conversation" className="space-y-4">
            <Card className="p-4">
              <CommentThread comments={ticket.comments} isStaff={isStaff} />
            </Card>
            {typingLabel && <p className="px-1 text-xs italic text-muted-foreground">{typingLabel}</p>}
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

        <CsatRating ticket={ticket} canRate={!isStaff && isClosed} />

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
