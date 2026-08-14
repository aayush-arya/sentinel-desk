import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** `default` for a full section/page; `compact` for dropdowns and small lists. */
  size?: 'default' | 'compact';
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, size = 'default', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 text-center',
        size === 'default' ? 'p-12' : 'p-6',
        className,
      )}
    >
      <div className={cn('flex items-center justify-center rounded-full bg-muted/60', size === 'default' ? 'size-12' : 'size-9')}>
        <Icon className={cn('text-muted-foreground', size === 'default' ? 'size-6' : 'size-4')} />
      </div>
      <p className={cn('font-medium', size === 'default' ? 'text-sm' : 'text-xs')}>{title}</p>
      {description && (
        <p className={cn('text-muted-foreground', size === 'default' ? 'text-sm' : 'text-xs')}>{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
