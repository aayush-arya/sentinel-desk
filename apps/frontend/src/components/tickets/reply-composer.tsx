'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CommentVisibility } from '@sentinel-desk/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/rich-text-editor';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAddComment } from '@/hooks/use-tickets';
import { useSuggestReply } from '@/hooks/use-ai';
import { useRealtime } from '@/lib/realtime-context';

// How long to wait after the last keystroke before telling other viewers we stopped typing.
const TYPING_IDLE_MS = 2_000;

export function ReplyComposer({
  ticketId,
  isStaff,
  willReopen,
}: {
  ticketId: string;
  isStaff: boolean;
  willReopen: boolean;
}) {
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<CommentVisibility>('PUBLIC');
  const [files, setFiles] = useState<File[]>([]);
  const addComment = useAddComment(ticketId);
  const suggestReply = useSuggestReply(ticketId);
  const { socket } = useRealtime();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEmpty = !body || body === '<p></p>';

  const stopTyping = useCallback(() => {
    if (!typingTimeoutRef.current) return;
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    socket?.emit('typing:stop', { ticketId });
  }, [socket, ticketId]);

  useEffect(() => {
    return () => stopTyping();
  }, [ticketId, stopTyping]);

  const handleBodyChange = (value: string) => {
    setBody(value);
    if (!socket) return;
    if (!typingTimeoutRef.current) {
      socket.emit('typing:start', { ticketId });
    } else {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const handleSubmit = async () => {
    if (isEmpty) return;
    stopTyping();
    try {
      await addComment.mutateAsync({ body, visibility: isStaff ? visibility : 'PUBLIC', files });
      setBody('');
      setFiles([]);
      toast.success(visibility === 'INTERNAL' ? 'Note added' : 'Reply sent');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to send reply'));
    }
  };

  const handleSuggestReply = async () => {
    try {
      const { reply } = await suggestReply.mutateAsync();
      if (reply) setBody(reply);
      else toast.info('Not enough context yet to suggest a reply');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to generate a suggested reply'));
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      {isStaff && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setVisibility('PUBLIC')}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                visibility === 'PUBLIC' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              Public reply
            </button>
            <button
              type="button"
              onClick={() => setVisibility('INTERNAL')}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                visibility === 'INTERNAL'
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              Internal note
            </button>
          </div>
          {visibility === 'PUBLIC' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleSuggestReply}
              disabled={suggestReply.isPending}
            >
              {suggestReply.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              Suggest reply
            </Button>
          )}
        </div>
      )}

      <RichTextEditor
        value={body}
        onChange={handleBodyChange}
        placeholder={visibility === 'INTERNAL' ? 'Note visible only to your team…' : 'Write a reply…'}
      />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {file.name}
              <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Paperclip className="size-3.5" />
          Attach files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <div className="flex items-center gap-3">
          {!isStaff && willReopen && (
            <span className="text-xs text-muted-foreground">Replying will reopen this ticket</span>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={isEmpty || addComment.isPending}>
            {addComment.isPending && <Loader2 className="size-3.5 animate-spin" />}
            {visibility === 'INTERNAL' ? 'Add note' : 'Send reply'}
          </Button>
        </div>
      </div>
    </div>
  );
}
