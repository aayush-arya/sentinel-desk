'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from '@/hooks/use-api-keys';
import { getApiErrorMessage } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonList } from '@/components/ui/skeleton-patterns';
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

export default function ApiKeysPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: apiKeys, isLoading } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [name, setName] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role.name !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);

  if (!user || user.role.name !== 'ADMIN') return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Give the key a name');
      return;
    }
    try {
      const result = await createApiKey.mutateAsync({ name });
      setCreatedKey(result.key);
      setName('');
      setFormOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create API key'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey.mutateAsync(id);
      toast.success('API key revoked');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to revoke API key'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
          <p className="text-sm text-muted-foreground">
            Authenticate external requests to the SentinelDesk API with{' '}
            <code className="rounded bg-muted px-1 text-xs">Authorization: Bearer &lt;key&gt;</code>.
          </p>
        </div>
        {!formOpen && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New key
          </Button>
        )}
      </div>

      {createdKey && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">API key created</p>
            <p className="text-xs text-muted-foreground">
              Copy this now — it won&apos;t be shown again. It has the same permissions as your admin account.
            </p>
            <code className="block break-all rounded-lg bg-muted px-3 py-2 text-xs">{createdKey}</code>
            <Button size="sm" variant="outline" onClick={() => setCreatedKey(null)}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New API key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CI pipeline, Zapier integration, ..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreate} disabled={createApiKey.isPending}>
                Generate key
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  setName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <SkeletonList count={3} rowClassName="h-16 w-full" className="p-0" />
      ) : apiKeys && apiKeys.length > 0 ? (
        <div className="space-y-2">
          {apiKeys.map((key) => (
            <Card key={key.id} className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{key.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{key.keyPrefix}••••••••••••••••</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'Never used'} · Created
                  by {key.createdBy.firstName} {key.createdBy.lastName}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Any integration using it will immediately stop working. This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => handleDelete(key.id)}>
                      Revoke
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          ))}
        </div>
      ) : (
        !formOpen && (
          <Card className="flex flex-col items-center gap-2 p-12 text-center">
            <KeyRound className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No API keys yet</p>
          </Card>
        )
      )}
    </div>
  );
}
