'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FormHint } from '@/components/ui/form-hint';
import { useAuthStore } from '@/lib/auth/store';
import { useToastStore } from '@/lib/ui/toast-store';

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
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email: string;
    verificationUrl?: string;
    verificationRequired?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const pushToast = useToastStore((state) => state.push);

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
      pushToast({
        title: 'Account created',
        message: 'Verification is still required before full access is opened.',
        tone: 'success',
      });
      form.reset({
        email: '',
        password: '',
        confirmPassword: '',
        type: values.type,
      });
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Unable to create account';
      setError(message);
      pushToast({
        title: 'Registration blocked',
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
    return <main className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">Preparing onboarding...</main>;
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
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Open a polished workspace for digital services</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </div>
        </div>

        <div className="grid w-full gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_16px_42px_rgba(30,99,219,0.18)]">
                <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={56} height={56} className="h-14 w-14 object-cover" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--brand-secondary)]">Create your account</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">WOLFIX DIGITAL AGENCY</p>
              </div>
            </div>
            <h1 className="font-display text-4xl leading-tight">Create your place inside the WOLFIX marketplace.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)]">
              Open your account and start using the WOLFIX workspace for secure digital service delivery and collaboration.
            </p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Create a profile for buying or offering digital services inside one protected marketplace.</div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Use one account to manage projects, communication, payments, and service activity.</div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">Account verification remains active before full workspace access is granted.</div>
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
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="type">How will you use WOLFIX?</label>
              <select id="type" {...form.register('type')}>
                <option value="vendor">Offer services</option>
                <option value="client">Buy services</option>
              </select>
              <FormHint text="Choose the main way you will start using the workspace. This can shape the first screens you see." />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="register-email">Email</label>
              <input id="register-email" type="email" placeholder="founder@marketplace.com" {...form.register('email')} />
              <FormHint text="Use an address you can verify immediately. Account access stays limited until verification is complete." />
              {form.formState.errors.email ? <p className="text-sm text-rose-300">{form.formState.errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="register-password">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
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
              <FormHint text="Use at least 8 characters. A longer password is safer and easier to defend over time." />
              {form.formState.errors.password ? <p className="text-sm text-rose-300">{form.formState.errors.password.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="register-confirm">Confirm password</label>
              <div className="relative">
                <input
                  id="register-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  className="pr-14"
                  {...form.register('confirmPassword')}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormHint text="Repeat the password exactly so the account can be created without delay." />
              {form.formState.errors.confirmPassword ? <p className="text-sm text-rose-300">{form.formState.errors.confirmPassword.message}</p> : null}
            </div>

            {error ? <FeedbackBanner message={error} tone="danger" onDismiss={() => setError(null)} /> : null}

            {success ? (
              <div className="space-y-3">
                <FeedbackBanner
                  message={`Account created for ${success.email}. Verification is still required before login is allowed.`}
                  tone="success"
                />
                {success.verificationUrl ? (
                  <a className="inline-block text-sm text-[var(--brand-primary)] underline underline-offset-4" href={success.verificationUrl}>
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

        <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.82),rgba(12,29,37,0.64))] px-5 py-4 text-sm text-[var(--text-secondary)] backdrop-blur-xl">
          Join the marketplace with one account for service delivery, conversations, and project visibility.
        </div>
        </div>
      </div>
    </main>
  );
}
