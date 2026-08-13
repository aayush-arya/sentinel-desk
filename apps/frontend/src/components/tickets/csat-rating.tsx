'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketDetail } from '@sentinel-desk/types';
import { useRateCsat } from '@/hooks/use-tickets';
import { getApiErrorMessage } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function Stars({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={cn(!readOnly && 'cursor-pointer')}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={cn('size-5', n <= display ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')}
          />
        </button>
      ))}
    </div>
  );
}

// Textarea isn't part of the shared ui kit yet - a plain styled element is enough here.
function SimpleTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
    />
  );
}

export function CsatRating({ ticket, canRate }: { ticket: TicketDetail; canRate: boolean }) {
  const rateCsat = useRateCsat(ticket.id);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (ticket.csatRatedAt) {
    return (
      <Card className="p-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Customer satisfaction</p>
        <Stars value={ticket.csatRating ?? 0} readOnly />
        {ticket.csatComment && <p className="mt-2 text-sm text-muted-foreground">&ldquo;{ticket.csatComment}&rdquo;</p>}
      </Card>
    );
  }

  if (!canRate) return null;

  const submit = async () => {
    if (rating === 0) {
      toast.error('Pick a star rating first');
      return;
    }
    try {
      await rateCsat.mutateAsync({ rating, comment: comment.trim() || undefined });
      toast.success('Thanks for the feedback!');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to submit rating'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How did we do?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Stars value={rating} onChange={setRating} />
        <SimpleTextarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything else you'd like to add? (optional)"
          rows={2}
        />
        <Button size="sm" onClick={submit} disabled={rateCsat.isPending}>
          Submit rating
        </Button>
      </CardContent>
    </Card>
  );
}
