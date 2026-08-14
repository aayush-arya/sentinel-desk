'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Webhook as WebhookIcon } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useWebhooks, useCreateWebhook, useDeleteWebhook } from '@/hooks/use-webhooks';
import { getApiErrorMessage } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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

const WEBHOOK_EVENTS = ['ticket.created', 'ticket.status_changed', 'ticket.escalated'];

export default function WebhooksPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: webhooks, isLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{ url: string; secret: string } | null>(null);

  useEffect(() => {
    if (user && user.role.name !== 'ADMIN' && user.role.name !== 'MANAGER') router.replace('/dashboard');
  }, [user, router]);

  if (!user || (user.role.name !== 'ADMIN' && user.role.name !== 'MANAGER')) return null;

  const toggleEvent = (event: string) => {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  };

  const handleCreate = async () => {
    if (!url.trim() || events.length === 0) {
      toast.error('A URL and at least one event are required');
      return;
    }
    try {
      const webhook = await createWebhook.mutateAsync({ url, events });
      setCreatedSecret({ url: webhook.url, secret: webhook.secret });
      setUrl('');
      setEvents([]);
      setFormOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create webhook'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhook.mutateAsync(id);
      toast.success('Webhook deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to delete webhook'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          <p className="text-sm text-muted-foreground">Send ticket events to an external URL as they happen.</p>
        </div>
        {!formOpen && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New webhook
          </Button>
        )}
      </div>

      {createdSecret && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">Webhook created for {createdSecret.url}</p>
            <p className="text-xs text-muted-foreground">
              Save this signing secret now — it won&apos;t be shown again. Use it to verify the
              <code className="mx-1 rounded bg-muted px-1">X-SentinelDesk-Signature</code>
              header (HMAC-SHA256 of the request body).
            </p>
            <code className="block break-all rounded-lg bg-muted px-3 py-2 text-xs">{createdSecret.secret}</code>
            <Button size="sm" variant="outline" onClick={() => setCreatedSecret(null)}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/sentineldesk"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event} className="flex items-center gap-2">
                    <Checkbox
                      id={`event-${event}`}
                      checked={events.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                    />
                    <Label htmlFor={`event-${event}`} className="font-mono text-xs font-normal">
                      {event}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreate} disabled={createWebhook.isPending}>
                Create webhook
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  setUrl('');
                  setEvents([]);
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
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : webhooks && webhooks.length > 0 ? (
        <div className="space-y-2">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{webhook.url}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline" className="font-mono text-[10px]">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this webhook?</AlertDialogTitle>
                      <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => handleDelete(webhook.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        !formOpen && (
          <Card className="flex flex-col items-center gap-2 p-12 text-center">
            <WebhookIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No webhooks configured</p>
          </Card>
        )
      )}
    </div>
  );
}
