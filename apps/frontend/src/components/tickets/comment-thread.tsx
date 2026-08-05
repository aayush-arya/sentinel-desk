import { Lock } from 'lucide-react';
import type { TicketComment } from '@sentinel-desk/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RichTextView } from '@/components/rich-text-editor';
import { cn } from '@/lib/utils';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CommentThread({ comments }: { comments: TicketComment[] }) {
  if (comments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No replies yet.</p>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const internal = comment.visibility === 'INTERNAL';
        return (
          <div
            key={comment.id}
            className={cn(
              'rounded-xl border p-4',
              internal ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card',
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarFallback className="text-[10px]">
                  {comment.author.firstName[0]}
                  {comment.author.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              <span className="text-xs text-muted-foreground">{formatTime(comment.createdAt)}</span>
              {internal && (
                <span className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <Lock className="size-3" />
                  Internal note
                </span>
              )}
            </div>
            <RichTextView html={comment.body} />
            {comment.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {comment.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {attachment.fileName}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
