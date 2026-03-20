'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth/store';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError(null);

    try {
      await login(values.email, values.password);
      router.push('/dashboard');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="flex flex-col justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.26em] text-[var(--brand-secondary)]">Secure operator access</p>
            <h1 className="font-display text-4xl leading-tight">Bring the fintech engine into a usable SaaS cockpit.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)]">
              Sign in with a verified backend account to unlock role-aware dashboards, wallet views, and admin controls.
            </p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Vendor users can manage profile posture and payouts.</div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Admin users can inspect platform health and risk telemetry.</div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Client users are ready for booking, escrow, and delivery experiences next.</div>
          </div>
        </Card>

        <Card className="p-8 lg:p-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Access portal</p>
              <h2 className="mt-2 font-display text-3xl">Sign in</h2>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/register" className="text-sm text-[var(--brand-secondary)]">
                Create account
              </Link>
              <Link href="/" className="text-sm text-[var(--brand-secondary)]">
                Back home
              </Link>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="operator@company.com" {...form.register('email')} />
              {form.formState.errors.email ? <p className="text-sm text-rose-300">{form.formState.errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="••••••••" {...form.register('password')} />
              {form.formState.errors.password ? <p className="text-sm text-rose-300">{form.formState.errors.password.message}</p> : null}
            </div>

            {error ? <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Enter workspace'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
