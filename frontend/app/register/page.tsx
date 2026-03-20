'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth/store';

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    type: z.enum(['client', 'vendor']),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const registerUser = useAuthStore((state) => state.register);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email: string;
    verificationUrl?: string;
    verificationRequired?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      type: 'vendor',
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await registerUser(values.email, values.password, values.type);
      setSuccess({
        email: values.email,
        verificationUrl: response.verification_url,
        verificationRequired: response.verification_required,
      });
      form.reset({
        email: '',
        password: '',
        confirmPassword: '',
        type: values.type,
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to create account');
    } finally {
      setLoading(false);
    }
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="flex flex-col justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.26em] text-[var(--brand-secondary)]">Operator onboarding</p>
            <h1 className="font-display text-4xl leading-tight">Create the first SaaS identity for your marketplace command layer.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)]">
              Registration already talks to the live Symfony backend and respects the verification policy enforced there.
            </p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Vendor registration opens the path for profile onboarding and payout setup.</div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Client registration prepares the user for booking, escrow, and milestone experiences.</div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Verification remains enforced by the backend before login access is granted.</div>
          </div>
        </Card>

        <Card className="p-8 lg:p-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Create account</p>
              <h2 className="mt-2 font-display text-3xl">Register</h2>
            </div>
            <Link href="/login" className="text-sm text-[var(--brand-secondary)]">
              Have an account?
            </Link>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="type">Account type</label>
              <select id="type" {...form.register('type')}>
                <option value="vendor">Vendor</option>
                <option value="client">Client</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="register-email">Email</label>
              <input id="register-email" type="email" placeholder="founder@marketplace.com" {...form.register('email')} />
              {form.formState.errors.email ? <p className="text-sm text-rose-300">{form.formState.errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="register-password">Password</label>
              <input id="register-password" type="password" placeholder="Minimum 8 characters" {...form.register('password')} />
              {form.formState.errors.password ? <p className="text-sm text-rose-300">{form.formState.errors.password.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="register-confirm">Confirm password</label>
              <input id="register-confirm" type="password" placeholder="Repeat password" {...form.register('confirmPassword')} />
              {form.formState.errors.confirmPassword ? <p className="text-sm text-rose-300">{form.formState.errors.confirmPassword.message}</p> : null}
            </div>

            {error ? <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                <p className="font-medium">Account created for {success.email}</p>
                <p className="mt-2 text-emerald-200/90">Verification is still required before login is allowed.</p>
                {success.verificationUrl ? (
                  <a className="mt-3 inline-block text-[var(--brand-primary)] underline underline-offset-4" href={success.verificationUrl}>
                    Open verification link
                  </a>
                ) : null}
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
