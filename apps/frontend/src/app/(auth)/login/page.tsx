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
import { Checkbox } from '@/components/ui/checkbox';
import { useLogin } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-client';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_PASSWORD = 'Password123!';
const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@acme.com' },
  { role: 'Manager', email: 'manager@acme.com' },
  { role: 'Senior Agent', email: 'senior@acme.com' },
  { role: 'Support Agent', email: 'agent@acme.com' },
  { role: 'Customer', email: 'customer@acme.com' },
];

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      toast.success('Welcome back');
      router.push(searchParams.get('next') || '/dashboard');
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to log in'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Log in to SentinelDesk</h1>
        <p className="text-sm text-muted-foreground">Welcome back. Enter your details to continue.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={watch('rememberMe')}
            onCheckedChange={(checked) => setValue('rememberMe', checked === true)}
          />
          <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
            Remember me for 30 days
          </Label>
        </div>

        {formError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Log in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have a workspace?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>

      <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Exploring the demo? One click fills the form — password is the same for every role.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setValue('email', account.email);
                setValue('password', DEMO_PASSWORD);
                setFormError(null);
              }}
              className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {account.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
