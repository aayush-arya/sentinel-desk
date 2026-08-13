import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconClassName?: string;
  loading?: boolean;
  href?: string;
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, iconClassName, loading, href, hint }: StatCardProps) {
  const content = (
    <Card className={cn(href && 'transition-colors hover:bg-muted/40')}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={cn('size-4 text-muted-foreground', iconClassName)} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-14" />
        ) : (
          <span className="text-2xl font-semibold">{value}</span>
        )}
        {hint && !loading && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
