'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FormHint } from '@/components/ui/form-hint';
import { useAuthStore } from '@/lib/auth/store';
import { useToastStore } from '@/lib/ui/toast-store';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const pushToast = useToastStore((state) => state.push);

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
      pushToast({
        title: 'Access granted',
        message: 'Opening your workspace now.',
        tone: 'success',
      });
      router.push('/dashboard');
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Unable to sign in';
      setError(message);
      pushToast({
        title: 'Sign-in blocked',
        message,
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (hydrated && user) {
      router.replace('/dashboard');
    }
  }, [hydrated, router, user]);

  if (!hydrated) {
    return <main className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">Preparing secure access...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-8">
      <div className="flex w-full flex-1 items-center">
        <div className="w-full">
        <div className="mb-6 flex items-center justify-between rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,19,26,0.88),rgba(13,28,36,0.78))] px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.94)] shadow-[0_12px_30px_rgba(7,24,84,0.18)]">
              <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={50} height={50} className="h-[50px] w-[50px] object-cover" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[var(--brand-secondary)]">WOLFIX DIGITAL AGENCY</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Secure access to the marketplace workspace</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/register">
              <Button>Create account</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_16px_42px_rgba(30,99,219,0.18)]">
                <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={56} height={56} className="h-14 w-14 object-cover" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--brand-secondary)]">Secure access</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">WOLFIX DIGITAL AGENCY</p>
              </div>
            </div>
            <h1 className="font-display text-4xl leading-tight">Sign in to your WOLFIX workspace.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)]">
              Access your bookings, services, conversations, notifications, and account activity in one secure place.
            </p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Manage digital services, communication, and delivery progress from one clean workspace.</div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Track account activity, payment progress, and alerts without leaving the main workflow.</div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Keep projects, service listings, and marketplace conversations organised in one place.</div>
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
              <input id="email" type="email" placeholder="you@example.com" {...form.register('email')} />
              <FormHint text="Use the same email address linked to your marketplace account." />
              {form.formState.errors.email ? <p className="text-sm text-rose-300">{form.formState.errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-14"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormHint text="Passwords are case-sensitive. Use the visibility toggle if you need to confirm what you typed." />
              {form.formState.errors.password ? <p className="text-sm text-rose-300">{form.formState.errors.password.message}</p> : null}
            </div>

            {error ? <FeedbackBanner message={error} tone="danger" onDismiss={() => setError(null)} /> : null}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Enter workspace'}
            </Button>
          </form>
        </Card>
        </div>

        <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.82),rgba(12,29,37,0.64))] px-5 py-4 text-sm text-[var(--text-secondary)] backdrop-blur-xl">
          One place for service activity, project coordination, and marketplace communication.
        </div>
        </div>
      </div>
    </main>
  );
}
