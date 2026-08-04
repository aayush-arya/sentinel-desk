'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAcceptInvite } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-client';
import { STRONG_PASSWORD_REGEX } from '@/lib/validation';

const schema = z.object({
  password: z
    .string()
    .regex(STRONG_PASSWORD_REGEX, 'At least 8 characters, with uppercase, lowercase, and a number'),
});
type Values = z.infer<typeof schema>;

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const acceptInvite = useAcceptInvite();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    setFormError(null);
    try {
      await acceptInvite.mutateAsync({ token, ...values });
      toast.success('Welcome to SentinelDesk');
      router.push('/dashboard');
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to accept this invite'));
    }
  };

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Invalid invite</h1>
        <p className="text-sm text-muted-foreground">This invite link is missing its token.</p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Set your password</h1>
        <p className="text-sm text-muted-foreground">Finish setting up your account to join the team.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        {formError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Accept invite & continue
        </Button>
      </form>
    </div>
  );
}
