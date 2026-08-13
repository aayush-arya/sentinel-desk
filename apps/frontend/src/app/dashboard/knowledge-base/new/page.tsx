'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCreateArticle } from '@/hooks/use-knowledge-base';
import { getApiErrorMessage } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';

export default function NewArticlePage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const createArticle = useCreateArticle();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (user && user.role.name === 'CUSTOMER') router.replace('/dashboard/knowledge-base');
  }, [user, router]);

  if (!user || user.role.name === 'CUSTOMER') return null;

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    try {
      const article = await createArticle.mutateAsync({ title, body, status });
      toast.success(status === 'PUBLISHED' ? 'Article published' : 'Draft saved');
      router.push(`/dashboard/knowledge-base/${article.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save article'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New article</h1>
        <p className="text-sm text-muted-foreground">Write it now, publish when you&apos;re ready.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How to reset your password"
            />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <RichTextEditor value={body} onChange={setBody} placeholder="Write the article…" />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => handleSave('PUBLISHED')} disabled={createArticle.isPending}>
              Publish
            </Button>
            <Button variant="outline" onClick={() => handleSave('DRAFT')} disabled={createArticle.isPending}>
              Save as draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
