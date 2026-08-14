'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/ui/skeleton-patterns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ENTITY_TYPES = ['ALL', 'Ticket', 'User'];

function formatMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [entityType, setEntityType] = useState('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAuditLogs({
    entityType: entityType === 'ALL' ? undefined : entityType,
    page,
    pageSize: 25,
  });

  useEffect(() => {
    if (user && user.role.name !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);

  if (!user || user.role.name !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">Every security- and compliance-relevant action in your organization.</p>
        </div>
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === 'ALL' ? 'All entities' : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <SkeletonList count={8} rowClassName="h-12 w-full" />
        ) : data && data.items.length > 0 ? (
          <div className="divide-y divide-border">
            {data.items.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-4 py-3">
                <span className="w-36 shrink-0 text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'System'}
                    </span>
                  </div>
                  {formatMetadata(entry.metadata) && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{formatMetadata(entry.metadata)}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{entry.entityType}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <ShieldCheck className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No audit entries yet</p>
          </div>
        )}
      </Card>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
