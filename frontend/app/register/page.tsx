'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BriefcaseBusiness, Eye, EyeOff, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FormHint } from '@/components/ui/form-hint';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import { AuthTopbar } from '@/components/layout/auth-topbar';
import { InstallCtaButton } from '@/components/pwa/install-cta-button';
import { apiClient } from '@/lib/api/client';
import { toLoginHref } from '@/lib/auth/login-link';
import { useAuthStore } from '@/lib/auth/store';
import { toVerificationPageHref } from '@/lib/auth/verification-link';
import { useToastStore } from '@/lib/ui/toast-store';

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(8),
    type: z.enum(['client', 'vendor']),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerUser = useAuthStore((state) => state.register);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email: string;
    type: 'client' | 'vendor';
    verificationUrl?: string;
    verificationRequired?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<{ message: string; verificationUrl?: string } | null>(null);
  const pushToast = useToastStore((state) => state.push);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    shouldFocusError: true,
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      type: 'vendor',
    },
  });
  const watchedType = useWatch({ control: form.control, name: 'type' }) ?? 'vendor';
  const watchedEmail = useWatch({ control: form.control, name: 'email' }) ?? '';
  const hintedEmail = (searchParams.get('email') ?? '').trim().toLowerCase();
  const reasonParam = searchParams.get('reason');
  const providerParam = (searchParams.get('provider') ?? '').trim().toLowerCase();
  const socialRoleRequired = reasonParam === 'social-role-required';
  const socialProviderLabel =
    providerParam === 'google' ? 'Google' : providerParam === 'github' ? 'GitHub' : 'your social account';
  const roleSetupCopy = watchedType === 'vendor'
    ? {
        lane: 'Vendor studio',
        cue: 'Open capability lanes and respond to live work.',
        signal: 'Sell digital services',
      }
    : {
        lane: 'Client workspace',
        cue: 'Browse lanes, book work, and track delivery.',
        signal: 'Buy digital services',
      };

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResendSuccess(null);

    try {
      const response = await registerUser(values.email, values.password, values.type);
      const verificationRequired = response.verification_required !== false;
      setSuccess({
        email: values.email,
        type: values.type,
        verificationUrl: response.verification_url,
        verificationRequired,
      });
      pushToast({
        title: 'Account created',
        message: verificationRequired
          ? 'Verification is still required before full access is opened.'
          : 'Account setup is complete. You can sign in now.',
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
    if (hydrated && user?.is_verified) {
      router.replace('/dashboard');
    }
  }, [hydrated, router, user]);

  useEffect(() => {
    if (!hintedEmail || form.getValues('email').trim().length > 0) {
      return;
    }

    form.setValue('email', hintedEmail, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [form, hintedEmail]);

  useEffect(() => {
    if (!error) {
      return;
    }

    document.getElementById('register-error-state')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const subscription = form.watch(() => {
      setError(null);
    });

    return () => subscription.unsubscribe();
  }, [error, form]);

  useEffect(() => {
    if (!success) {
      return;
    }

    document.getElementById('register-success-state')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [success]);

  const successLaneCopy = success?.type === 'client'
    ? {
        lane: 'Client workspace',
        signal: 'Buyer lane',
        cue: 'Sign in to browse lanes and track delivery.',
      }
    : {
        lane: 'Vendor studio',
        signal: 'Seller lane',
        cue: 'Sign in to open capability lanes and reply to live work.',
      };
  const verificationPageHref = toVerificationPageHref(success?.verificationUrl, {
    email: success?.email,
    type: success?.type,
    source: 'register',
  });
  const resendVerificationPageHref = toVerificationPageHref(resendSuccess?.verificationUrl, {
    email: success?.email,
    type: success?.type,
    source: 'register',
  });
  const loginHref = toLoginHref({
    email: success?.email,
    reason: success?.verificationRequired === false ? 'account-ready' : 'verify-required',
  });

  const handleResendVerification = async () => {
    if (!success?.email) {
      return;
    }

    setResendLoading(true);
    setResendSuccess(null);

    try {
      const response = await apiClient.resendVerification(success.email);
      setResendSuccess({
        message: response.message,
        verificationUrl: response.verification_url,
      });
      pushToast({
        title: 'Verification link prepared',
        message: response.message,
        tone: 'success',
      });
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Unable to prepare a new verification link';
      setError(message);
      pushToast({
        title: 'Verification resend blocked',
        message,
        tone: 'danger',
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <AuthTopbar subtitle="Open your workspace" primaryHref="/login" primaryLabel="Sign in" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10 lg:px-8">
        <div className="w-full">
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
              Create one account and choose your lane.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <InstallCtaButton variant="ghost" />
              <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Install after hosting on HTTPS
              </span>
            </div>

            {socialRoleRequired ? (
              <div className="mt-5 rounded-[20px] border border-[rgba(59,130,246,0.22)] bg-[rgba(239,246,255,0.92)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--brand-primary)]">Choose your lane first</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  We found a new {socialProviderLabel} account for {hintedEmail || 'this email'}. Pick a role first, then continue.
                </p>
              </div>
            ) : null}
          </div>
          <div className="mt-8 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Onboarding path</p>
                <p className="mt-2 font-display text-2xl text-[var(--text-primary)]">Three quick steps</p>
              </div>
              <div className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                Verified entry
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { title: 'Choose role', copy: 'Start in the right desk.', icon: <BriefcaseBusiness className="size-4" />, tone: 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]' },
                { title: 'Verify access', copy: 'Confirm ownership cleanly.', icon: <ShieldCheck className="size-4" />, tone: 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]' },
                { title: 'Enter workspace', copy: 'Move into live flow.', icon: <Wallet className="size-4" />, tone: 'bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]' },
              ].map((item) => (
                <div key={item.title} className="rounded-[18px] border border-[var(--line)] bg-white p-4">
                  <div className={`inline-flex size-9 items-center justify-center rounded-2xl ${item.tone}`}>{item.icon}</div>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.title}</p>
                  <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { title: 'Single account', copy: 'Services, messages, and payments together.', icon: <Wallet className="size-4" /> },
              { title: 'Verified entry', copy: 'Access opens after confirmation.', icon: <ShieldCheck className="size-4" /> },
            ].map((item) => (
              <div key={item.title} className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
                <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                  {item.icon}
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.title}</p>
                </div>
                <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{item.copy}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8 lg:p-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Create account</p>
              <h2 className="mt-2 font-display text-3xl">Register</h2>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-[var(--brand-secondary)]">
                Have an account?
              </Link>
              <div className="hidden rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)] sm:inline-flex">
                <Sparkles className="mr-2 size-3.5" />
                Account setup
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              { title: 'Role entry', value: 'Choose', icon: BriefcaseBusiness },
              { title: 'Secure setup', value: 'Verify', icon: ShieldCheck },
              { title: 'Workspace ready', value: 'Launch', icon: Sparkles },
            ].map(({ title, value, icon: Icon }) => (
              <div key={title} className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
                <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                  <Icon className="size-4" />
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{title}</p>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
              </div>
            ))}
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="type">How will you use WOLFIX?</label>
              <select id="type" {...form.register('type')}>
                <option value="vendor">Provide capability lanes</option>
                <option value="client">Request managed services</option>
              </select>
              <FormHint text="Choose how you want to start." />
              <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                    {roleSetupCopy.signal}
                  </span>
                  <span className="rounded-full border border-[rgba(20,184,166,0.16)] bg-[rgba(240,253,250,0.94)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-teal)]">
                    {roleSetupCopy.lane}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{roleSetupCopy.cue}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Quick account setup</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Use Google or GitHub for the {watchedType === 'vendor' ? 'vendor studio' : 'client workspace'} you chose above.
                </p>
              </div>
              <SocialAuthButtons
                intent="register"
                role={watchedType}
                next={watchedType === 'vendor' ? '/dashboard/vendor' : '/dashboard/client'}
              />
            </div>

            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              <span className="h-px flex-1 bg-[var(--line)]" />
              <span>Or create with email</span>
              <span className="h-px flex-1 bg-[var(--line)]" />
            </div>

            <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-12 items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(147,197,253,0.25)] bg-white shadow-[0_10px_24px_rgba(30,64,175,0.12)]">
                  <Image src="/auth/email.svg" alt="" width={48} height={48} className="size-12 object-cover" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Email setup</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Use email and password if you prefer direct sign-in.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="register-email">Email</label>
              <input id="register-email" type="email" placeholder="founder@marketplace.com" {...form.register('email')} />
              <FormHint text="Use an email you can verify now." />
              {form.formState.errors.email ? <p className="text-sm text-rose-600">{form.formState.errors.email.message}</p> : null}
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
              <FormHint text="Use at least 8 characters with one uppercase letter and one number." />
              {form.formState.errors.password ? <p className="text-sm text-rose-600">{form.formState.errors.password.message}</p> : null}
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
              <FormHint text="Repeat the same password." />
              {form.formState.errors.confirmPassword ? <p className="text-sm text-rose-600">{form.formState.errors.confirmPassword.message}</p> : null}
            </div>

            {error ? (
              <div id="register-error-state">
                <FeedbackBanner message={error} tone="danger" onDismiss={() => setError(null)} />
              </div>
            ) : null}

            {success ? (
              <div id="register-success-state" className="space-y-3">
                <FeedbackBanner
                  message={
                    success.verificationRequired === false
                      ? `${success.type === 'client' ? 'Client' : 'Vendor'} account created for ${success.email}. You can continue to sign in now.`
                      : `${success.type === 'client' ? 'Client' : 'Vendor'} account created for ${success.email}. Verification is still required before login is allowed.`
                  }
                  tone="success"
                />
                <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                      {successLaneCopy?.signal}
                    </span>
                    <span className="rounded-full border border-[rgba(20,184,166,0.16)] bg-[rgba(240,253,250,0.94)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-teal)]">
                      {successLaneCopy?.lane}
                    </span>
                    <span className="rounded-full border border-[rgba(245,158,11,0.16)] bg-[rgba(255,251,235,0.94)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-amber)]">
                      {success.verificationRequired === false ? 'Entry ready' : 'Verify first'}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Next step</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {success.verificationRequired === false
                      ? 'Your account is ready. Sign in now.'
                      : success.verificationUrl
                        ? 'Open the verification link first.'
                        : 'Check your inbox for the verification email first.'}
                  </p>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{successLaneCopy?.cue}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {verificationPageHref ? (
                      <Link href={verificationPageHref}>
                        <Button variant="ghost">Open verification link</Button>
                      </Link>
                    ) : null}
                    {success.verificationRequired !== false ? (
                      <Button type="button" variant="ghost" onClick={handleResendVerification} disabled={resendLoading}>
                        {resendLoading ? 'Preparing fresh verification link...' : 'Resend verification'}
                      </Button>
                    ) : null}
                    <Link href={loginHref}>
                      <Button>{success.verificationRequired === false ? 'Sign in now' : 'Go to sign in'}</Button>
                    </Link>
                  </div>
                  {resendSuccess ? (
                    <div className="mt-4 space-y-3">
                      <FeedbackBanner message={resendSuccess.message} tone="success" />
                      {resendVerificationPageHref ? (
                        <Link href={resendVerificationPageHref}>
                          <Button variant="ghost">Open fresh verification link</Button>
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : watchedEmail.trim().length > 0 ? `Create ${watchedType} account` : 'Create account'}
            </Button>
          </form>
        </Card>
        </div>

        <div className="mt-6 grid gap-3 rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.9)] px-5 py-4 text-sm text-[var(--text-secondary)] backdrop-blur-xl sm:grid-cols-3">
          {[
            { title: 'Role-first', copy: 'Start as client or vendor', icon: BriefcaseBusiness },
            { title: 'Verification', copy: 'Required before entry', icon: ShieldCheck },
            { title: 'Launch', copy: 'Move into the right workspace', icon: Sparkles },
          ].map(({ title, copy, icon: Icon }) => (
            <div key={title} className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4">
              <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                <Icon className="size-4" />
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{title}</p>
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{copy}</p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </main>
  );
}

function RegisterPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 text-[var(--text-secondary)]">
      Preparing account setup...
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterPageView />
    </Suspense>
  );
}
