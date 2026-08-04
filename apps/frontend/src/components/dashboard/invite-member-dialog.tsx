'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { RoleName } from '@sentinel-desk/types';
import { ROLE_LABELS } from '@sentinel-desk/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInviteMember } from '@/hooks/use-team';
import { getApiErrorMessage } from '@/lib/api-client';
import { grantableRoles } from '@/lib/rbac';

const schema = z.object({
  firstName: z.string().min(1, 'Required').max(60),
  lastName: z.string().min(1, 'Required').max(60),
  email: z.string().min(1, 'Required').email('Enter a valid email address'),
  role: z.enum(['CUSTOMER', 'AGENT', 'SENIOR_AGENT', 'MANAGER', 'ADMIN']),
});
type Values = z.infer<typeof schema>;

export function InviteMemberDialog({ actorRole }: { actorRole: RoleName }) {
  const [open, setOpen] = useState(false);
  const invite = useInviteMember();
  const roles = grantableRoles(actorRole);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: roles[0] } });

  const onSubmit = async (values: Values) => {
    try {
      await invite.mutateAsync(values);
      toast.success(`Invite sent to ${values.email}`);
      reset({ firstName: '', lastName: '', email: '', role: roles[0] });
      setOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to send invite'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>They&apos;ll receive an email with a link to set their password.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
