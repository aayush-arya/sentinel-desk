'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Eye, Plus, Search } from 'lucide-react';
import type { KnowledgeArticleStatus } from '@sentinel-desk/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useArticles } from '@/hooks/use-knowledge-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function KnowledgeBasePage() {
  return (
    <Suspense>
      <KnowledgeBaseContent />
    </Suspense>
  );
}

function KnowledgeBaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const status = searchParams.get('status') as KnowledgeArticleStatus | null;

  const { data, isLoading } = useArticles({ search: search || undefined, status: status ?? undefined });

  if (!user) return null;
  const staff = user.role.name !== 'CUSTOMER';

  const setStatusParam = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'ALL') params.delete('status');
    else params.set('status', value);
    router.push(`/dashboard/knowledge-base?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge base</h1>
          <p className="text-sm text-muted-foreground">
            {staff ? 'Articles your team can share with customers or lean on internally.' : 'Answers to common questions.'}
          </p>
        </div>
        {staff && (
          <Button asChild>
            <Link href="/dashboard/knowledge-base/new">
              <Plus className="size-4" />
              New article
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="pl-8"
          />
        </div>
        {staff && (
          <Select value={status ?? 'ALL'} onValueChange={setStatusParam}>
            <SelectTrigger className="w-40" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((article) => (
            <Link key={article.id} href={`/dashboard/knowledge-base/${article.id}`}>
              <Card className="h-full space-y-2 p-4 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-medium">{article.title}</h3>
                  {article.status === 'DRAFT' && (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      Draft
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {article.author.firstName} {article.author.lastName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="size-3" />
                    {article.viewCount}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <BookOpen className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No articles found</p>
          <p className="text-sm text-muted-foreground">
            {staff ? 'Write one to help your team and customers.' : 'Check back later.'}
          </p>
        </Card>
      )}
    </div>
  );
}
