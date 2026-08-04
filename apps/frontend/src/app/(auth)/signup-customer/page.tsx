'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignupCustomer } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-client';
import { STRONG_PASSWORD_REGEX } from '@/lib/validation';

const schema = z.object({
  organizationSlug: z.string().min(1, 'Support portal is required'),
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .regex(STRONG_PASSWORD_REGEX, 'At least 8 characters, with uppercase, lowercase, and a number'),
});
type Values = z.infer<typeof schema>;

export default function SignupCustomerPage() {
  return (
    <Suspense>
      <SignupCustomerForm />
    </Suspense>
  );
}

function SignupCustomerForm() {
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get('org') ?? '';
  const signupCustomer = useSignupCustomer();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { organizationSlug: orgSlug },
  });

  const onSubmit = async (values: Values) => {
    setFormError(null);
    try {
      await signupCustomer.mutateAsync(values);
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to create your account'));
    }
  };

  if (signupCustomer.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="size-6 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to your inbox. Verify your address to start submitting tickets.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Create a customer account</h1>
        <p className="text-sm text-muted-foreground">Sign up to submit and track support tickets.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="organizationSlug">Support portal</Label>
          <Input
            id="organizationSlug"
            placeholder="acme"
            aria-invalid={!!errors.organizationSlug}
            {...register('organizationSlug')}
          />
          {errors.organizationSlug && (
            <p className="text-sm text-destructive">{errors.organizationSlug.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" aria-invalid={!!errors.firstName} {...register('firstName')} />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" aria-invalid={!!errors.lastName} {...register('lastName')} />
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
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
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
