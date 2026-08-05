'use client';

import { useEffect, useState } from 'react';
import { Clock, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.abs(ms) / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SlaCountdown({
  dueAt,
  breached,
  paused,
  label,
  className,
}: {
  dueAt: string | null;
  breached: boolean;
  paused?: boolean;
  label: string;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!dueAt || now === null) return null;

  const remaining = new Date(dueAt).getTime() - now;
  const isOverdue = breached || remaining < 0;

  let colorClass = 'text-emerald-600 dark:text-emerald-400';
  if (isOverdue) colorClass = 'text-red-600 dark:text-red-400';
  else if (remaining < 60 * 60 * 1000) colorClass = 'text-amber-600 dark:text-amber-400';

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        paused ? 'text-muted-foreground' : colorClass,
        className,
      )}
    >
      {paused ? <PauseCircle className="size-3" /> : <Clock className="size-3" />}
      <span>
        {label}:{' '}
        {paused ? 'Paused' : isOverdue ? `Overdue by ${formatDuration(remaining)}` : `${formatDuration(remaining)} left`}
      </span>
    </div>
  );
}
