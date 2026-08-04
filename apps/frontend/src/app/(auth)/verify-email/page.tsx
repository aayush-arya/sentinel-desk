'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVerifyEmail } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-client';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verifyEmail = useVerifyEmail();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !token) return;
    attempted.current = true;
    verifyEmail.mutate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Invalid link</h1>
        <p className="text-sm text-muted-foreground">This verification link is missing its token.</p>
      </div>
    );
  }

  if (verifyEmail.isPending || verifyEmail.isIdle) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verifying your email…</p>
      </div>
    );
  }

  if (verifyEmail.isError) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="size-6 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Verification failed</h1>
        <p className="text-sm text-muted-foreground">
          {getApiErrorMessage(verifyEmail.error, 'This link is invalid or has expired.')}
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="size-6 text-primary" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Email verified</h1>
      <p className="text-sm text-muted-foreground">Your address has been confirmed. You can log in now.</p>
      <Button asChild className="w-full">
        <Link href="/login">Continue to login</Link>
      </Button>
    </div>
  );
}
