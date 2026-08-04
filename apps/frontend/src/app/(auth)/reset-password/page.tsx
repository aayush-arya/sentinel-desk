'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetPassword } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-client';
import { STRONG_PASSWORD_REGEX } from '@/lib/validation';

const schema = z.object({
  password: z
    .string()
    .regex(STRONG_PASSWORD_REGEX, 'At least 8 characters, with uppercase, lowercase, and a number'),
});
type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const resetPassword = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    setFormError(null);
    try {
      await resetPassword.mutateAsync({ token, ...values });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to reset your password'));
    }
  };

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Invalid link</h1>
        <p className="text-sm text-muted-foreground">This password reset link is missing its token.</p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="size-6 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Password updated</h1>
        <p className="text-sm text-muted-foreground">
          Your password has been changed and all previous sessions were signed out.
        </p>
        <Button className="w-full" onClick={() => router.push('/login')}>
          Continue to login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Make it something you haven&apos;t used before.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
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
          Update password
        </Button>
      </form>
    </div>
  );
}
