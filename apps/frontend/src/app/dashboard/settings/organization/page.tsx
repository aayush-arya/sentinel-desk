'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organization';
import { getApiErrorMessage } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandLogo } from '@/components/brand-logo';

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: org, isLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366F1');

  useEffect(() => {
    if (org) {
      setName(org.name);
      setLogoUrl(org.logoUrl ?? '');
      setPrimaryColor(org.primaryColor);
    }
  }, [org]);

  useEffect(() => {
    if (user && user.role.name !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);

  if (!user || user.role.name !== 'ADMIN') return null;

  const handleSave = async () => {
    try {
      await updateOrg.mutateAsync({
        name: name.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        primaryColor,
      });
      toast.success('Organization updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update organization'));
    }
  };

  if (isLoading || !org) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization branding</h1>
        <p className="text-sm text-muted-foreground">Shown across the dashboard for everyone in {org.name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandLogo logoUrl={logoUrl || undefined} wordmark={name || 'SentinelDesk'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-logo">Logo URL</Label>
            <Input
              id="org-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-color">Brand color</Label>
            <div className="flex items-center gap-2">
              <input
                id="org-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-1"
              />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateOrg.isPending}>
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
