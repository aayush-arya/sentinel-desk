import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
  /** Org-uploaded logo (Organization.logoUrl) - falls back to the SentinelDesk mark when unset. */
  logoUrl?: string | null;
  wordmark?: string;
}

export function BrandLogo({ className, showWordmark = true, logoUrl, wordmark = 'SentinelDesk' }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary tenant-hosted URLs, not a local/optimizable asset
        <img src={logoUrl} alt={wordmark} className="size-7 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-from)] via-[var(--brand-via)] to-[var(--brand-to)] shadow-sm">
          <ShieldCheck className="size-4 text-white" strokeWidth={2.5} />
        </div>
      )}
      {showWordmark && <span className="text-base font-semibold tracking-tight">{wordmark}</span>}
    </div>
  );
}
