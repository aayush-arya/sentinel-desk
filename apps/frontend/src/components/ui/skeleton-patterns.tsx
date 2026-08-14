import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Replaces the `Array.from({length:N}).map(...)` row-skeleton block that was
 * hand-copied across ~10 pages (tickets list, SLA violations, audit log, team,
 * sessions, webhooks, API keys, macros, knowledge base). Matches the padded,
 * evenly-spaced list layout those pages already render once data loads.
 */
export function SkeletonList({
  count = 5,
  rowClassName = 'h-14 w-full',
  className,
}: {
  count?: number;
  rowClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2 p-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  );
}

/** A single card-shaped placeholder — for one-off card loading states. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn('space-y-3 p-4', className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </Card>
  );
}

/** Bar-chart-shaped placeholder for analytics/reporting panels. */
export function SkeletonChart({ className }: { className?: string }) {
  const heights = [40, 65, 50, 80, 60, 90, 45];
  return (
    <div className={cn('flex h-48 items-end gap-2 p-4', className)}>
      {heights.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** Matches the ticket detail page's two-column layout (subject/thread + sidebar). */
export function SkeletonTicketDetail() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Card className="space-y-3 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-5/6" />
          <Skeleton className="h-16 w-full" />
        </Card>
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-4">
        <Card className="space-y-3 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </Card>
      </div>
    </div>
  );
}
