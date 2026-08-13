'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useMacros, useCreateMacro, useDeleteMacro } from '@/hooks/use-macros';
import { getApiErrorMessage } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function MacrosPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: macros, isLoading } = useMacros();
  const createMacro = useCreateMacro();
  const deleteMacro = useDeleteMacro();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (user && user.role.name === 'CUSTOMER') router.replace('/dashboard');
  }, [user, router]);

  if (!user || user.role.name === 'CUSTOMER') return null;

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    try {
      await createMacro.mutateAsync({ title, body });
      setTitle('');
      setBody('');
      setFormOpen(false);
      toast.success('Macro saved');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save macro'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMacro.mutateAsync(id);
      toast.success('Macro deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to delete macro'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved replies</h1>
          <p className="text-sm text-muted-foreground">Canned responses your team can drop into any reply.</p>
        </div>
        {!formOpen && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New macro
          </Button>
        )}
      </div>

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New macro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="macro-title">Title</Label>
              <Input id="macro-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Password reset instructions" />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <RichTextEditor value={body} onChange={setBody} placeholder="Write the reply text…" />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreate} disabled={createMacro.isPending}>
                Save macro
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  setTitle('');
                  setBody('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : macros && macros.length > 0 ? (
        <div className="space-y-2">
          {macros.map((macro) => (
            <Card key={macro.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{macro.title}</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this macro?</AlertDialogTitle>
                      <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => handleDelete(macro.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <RichTextView html={macro.body} className="text-muted-foreground" />
            </Card>
          ))}
        </div>
      ) : (
        !formOpen && (
          <Card className="flex flex-col items-center gap-2 p-12 text-center">
            <p className="text-sm font-medium">No saved replies yet</p>
            <p className="text-sm text-muted-foreground">Create one to speed up common responses.</p>
          </Card>
        )
      )}
    </div>
  );
}
