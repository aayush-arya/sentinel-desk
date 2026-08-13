'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Pencil, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useArticle, useUpdateArticle, useDeleteArticle } from '@/hooks/use-knowledge-base';
import { getApiErrorMessage } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor, RichTextView } from '@/components/rich-text-editor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: article, isLoading, isError } = useArticle(params.id);
  const updateArticle = useUpdateArticle(params.id);
  const deleteArticle = useDeleteArticle();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setBody(article.body);
    }
  }, [article]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Article not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/knowledge-base">Back to knowledge base</Link>
        </Button>
      </div>
    );
  }

  const staff = user.role.name !== 'CUSTOMER';

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    try {
      await updateArticle.mutateAsync({ title, body });
      setEditing(false);
      toast.success('Article updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update article'));
    }
  };

  const togglePublish = async () => {
    try {
      await updateArticle.mutateAsync({ status: article.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' });
      toast.success(article.status === 'PUBLISHED' ? 'Unpublished' : 'Published');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update status'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteArticle.mutateAsync(article.id);
      toast.success('Article deleted');
      router.push('/dashboard/knowledge-base');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to delete article'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/dashboard/knowledge-base" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Knowledge base
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {editing ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-semibold" />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">{article.title}</h1>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              By {article.author.firstName} {article.author.lastName}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {article.viewCount} views
            </span>
            {article.status === 'DRAFT' && <Badge variant="outline">Draft</Badge>}
          </div>
        </div>

        {staff && !editing && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={togglePublish} disabled={updateArticle.isPending}>
              {article.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon-sm">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this article?</AlertDialogTitle>
                  <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Body</Label>
                <RichTextEditor value={body} onChange={setBody} />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSave} disabled={updateArticle.isPending}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTitle(article.title);
                    setBody(article.body);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <RichTextView html={article.body} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
