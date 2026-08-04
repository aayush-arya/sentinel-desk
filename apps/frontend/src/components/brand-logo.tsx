import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrandLogo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-from)] via-[var(--brand-via)] to-[var(--brand-to)] shadow-sm">
        <ShieldCheck className="size-4 text-white" strokeWidth={2.5} />
      </div>
      {showWordmark && <span className="text-base font-semibold tracking-tight">SentinelDesk</span>}
    </div>
  );
}
