'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, MessageSquareMore, ShieldCheck, Wallet } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
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
import { useAuthStore } from '@/lib/auth/store';
import { apiClient } from '@/lib/api/client';
import { sanitizeLoginNext, type LoginLinkReason } from '@/lib/auth/login-link';
import { toVerificationPageHref } from '@/lib/auth/verification-link';
import { getFavoriteIcon, getFavoriteToneClasses } from '@/lib/ui/favorite-route-style';
import { useToastStore } from '@/lib/ui/toast-store';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginRouteMemoryItem {
  href: string;
  title: string;
  subtitle?: string;
  customLabel?: string;
  tone?: 'amber' | 'teal' | 'cyan' | 'indigo' | 'coral';
  icon?: 'star' | 'wallet' | 'shield' | 'message' | 'briefcase';
}

interface LoginReminderMemoryItem {
  dueAt: string;
  status: 'open' | 'done';
  userKey: string;
  title: string;
}

interface LoginFocusMemoryItem extends LoginRouteMemoryItem {
  focusCount: number;
  userKey: string;
  lastFocusedAt: string;
}

interface LoginWorkspaceMemorySnapshot {
  favoriteRoute: LoginRouteMemoryItem | null;
  recentRoute: LoginRouteMemoryItem | null;
  topFocusLane: LoginFocusMemoryItem | null;
  openReminders: LoginReminderMemoryItem[];
}

function getWorkItemLabel(item: { title: string; customLabel?: string }) {
  const normalized = item.customLabel?.trim();
  return normalized && normalized.length > 0 ? normalized : item.title;
}

function getReminderDueLabel(dueAt: string) {
  const due = new Date(dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfNextWeek = new Date(startOfToday);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  if (due < now) {
    return 'Overdue';
  }

  if (due < startOfTomorrow) {
    return 'Due today';
  }

  if (due < startOfNextWeek) {
    return 'Due this week';
  }

  return due.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function getRouteLabel(path?: string | null) {
  if (!path) {
    return null;
  }

  if (path === '/dashboard') {
    return 'Command center';
  }

  if (path === '/dashboard/client') {
    return 'Client lane';
  }

  if (path === '/dashboard/vendor') {
    return 'Vendor studio';
  }

  if (path === '/dashboard/admin') {
    return 'Operations desk';
  }

  if (path === '/dashboard/communications') {
    return 'Inbox lane';
  }

  if (path === '/dashboard/notifications') {
    return 'Alerts lane';
  }

  if (path.startsWith('/dashboard/bookings/')) {
    return 'Booking workspace';
  }

  if (path.startsWith('/dashboard/request-services/')) {
    return 'Service request lane';
  }

  return 'Saved workspace lane';
}

async function loadWorkspaceMemory(userKey: string): Promise<LoginWorkspaceMemorySnapshot> {
  if (!userKey) {
    return {
      favoriteRoute: null,
      recentRoute: null,
      topFocusLane: null,
      openReminders: [],
    };
  }

  const [{ useRecentWorkStore }, { useWorkspaceFocusHistoryStore }, { useWorkspaceReminderStore }] = await Promise.all([
    import('@/lib/ui/recent-work-store'),
    import('@/lib/ui/workspace-focus-history-store'),
    import('@/lib/ui/workspace-reminder-store'),
  ]);

  const recentState = useRecentWorkStore.getState();
  const focusState = useWorkspaceFocusHistoryStore.getState();
  const reminderState = useWorkspaceReminderStore.getState();

  return {
    favoriteRoute: recentState.favorites.find((item) => item.userKey === userKey) ?? null,
    recentRoute: recentState.items.find((item) => item.userKey === userKey) ?? null,
    topFocusLane:
      focusState.items
        .filter((item) => item.userKey === userKey)
        .sort((left, right) => right.focusCount - left.focusCount || new Date(right.lastFocusedAt).getTime() - new Date(left.lastFocusedAt).getTime())[0] ?? null,
    openReminders: reminderState.items
      .filter((item) => item.userKey === userKey && item.status === 'open')
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()),
  };
}

function LoginPageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<{ message: string; verificationUrl?: string } | null>(null);
  const [entryNoticeDismissed, setEntryNoticeDismissed] = useState(false);
  const [workspaceMemory, setWorkspaceMemory] = useState<LoginWorkspaceMemorySnapshot>({
    favoriteRoute: null,
    recentRoute: null,
    topFocusLane: null,
    openReminders: [],
  });
  const pushToast = useToastStore((state) => state.push);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    shouldFocusError: true,
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const watchedEmail = useWatch({ control: form.control, name: 'email' }) ?? '';
  const hintedEmail = (searchParams.get('email') ?? '').trim().toLowerCase();
  const reasonParam = searchParams.get('reason');
  const providerParam = (searchParams.get('provider') ?? '').trim().toLowerCase();
  const loginReason: LoginLinkReason | null =
    reasonParam === 'verified' ||
    reasonParam === 'verify-required' ||
    reasonParam === 'signed-out' ||
    reasonParam === 'session-required' ||
    reasonParam === 'account-ready'
      ? reasonParam
      : null;
  const socialAuthReason =
    reasonParam === 'social-auth-failed' || reasonParam === 'social-auth-unavailable'
      ? reasonParam
      : null;
  const socialProviderLabel =
    providerParam === 'google' ? 'Google' : providerParam === 'github' ? 'GitHub' : 'social sign-in';
  const nextPath = sanitizeLoginNext(searchParams.get('next'));
  const nextRouteLabel = getRouteLabel(nextPath);
  const normalizedEmail = watchedEmail.trim().toLowerCase();
  const memoryUserKey = normalizedEmail || hintedEmail;
  const { favoriteRoute, recentRoute, topFocusLane, openReminders } = workspaceMemory;
  const resumeRoute = favoriteRoute ?? recentRoute ?? topFocusLane;
  const favoriteTone = getFavoriteToneClasses(favoriteRoute?.tone);
  const FavoriteIcon = getFavoriteIcon(favoriteRoute?.icon);
  const dueTodayCount = openReminders.filter((item) => getReminderDueLabel(item.dueAt) === 'Due today' || getReminderDueLabel(item.dueAt) === 'Overdue').length;
  const nextReminder = openReminders[0];
  const canResendVerification = (error === 'Email not verified' || loginReason === 'verify-required') && normalizedEmail.length > 0;
  const resendVerificationPageHref = toVerificationPageHref(resendSuccess?.verificationUrl, {
    email: normalizedEmail,
    source: 'login',
  });
  const loginActionLabel = nextRouteLabel
    ? `Sign in and reopen ${nextRouteLabel.toLowerCase()}`
    : watchedEmail.trim().length > 0
      ? (resumeRoute ? 'Sign in and resume last task' : 'Sign in and open workspace')
      : 'Enter workspace';
  const entryNotice = useMemo(() => {
    if (loginReason === 'verified') {
      return {
        tone: 'success' as const,
        title: 'Verification complete',
        message: 'Email verified. Sign in now.',
        actionHint: 'Use the same email to continue.',
      };
    }

    if (loginReason === 'verify-required') {
      return {
        tone: 'warning' as const,
        title: 'Verification still needed',
        message: 'Verify this email first, then sign in again.',
        actionHint: 'Resend a new link below if needed.',
      };
    }

    if (loginReason === 'signed-out') {
      return {
        tone: 'info' as const,
        title: 'Signed out cleanly',
        message: 'You have been signed out cleanly.',
        actionHint: 'Sign in again when ready.',
      };
    }

    if (loginReason === 'session-required') {
      return {
        tone: 'info' as const,
        title: nextRouteLabel ? `${nextRouteLabel} is waiting` : 'Session needed again',
        message: nextPath ? 'Sign in again to reopen your last workspace.' : 'Sign in again to reopen your workspace.',
        actionHint: nextRouteLabel ? `You will return to ${nextRouteLabel.toLowerCase()}.` : 'Your workspace will open again.',
      };
    }

    if (loginReason === 'account-ready') {
      return {
        tone: 'success' as const,
        title: 'Account ready',
        message: 'Account setup is complete. Sign in now.',
        actionHint: 'Use the same email to continue.',
      };
    }

    if (socialAuthReason === 'social-auth-unavailable') {
      return {
        tone: 'warning' as const,
        title: `${socialProviderLabel} is not ready yet`,
        message: `${socialProviderLabel} is not configured in this environment yet.`,
        actionHint: 'Use email for now.',
      };
    }

    if (socialAuthReason === 'social-auth-failed') {
      return {
        tone: 'danger' as const,
        title: `${socialProviderLabel} sign-in did not complete`,
        message: `We could not finish the ${socialProviderLabel.toLowerCase()} sign-in flow.`,
        actionHint: 'Try again or use email.',
      };
    }

    return null;
  }, [loginReason, nextPath, nextRouteLabel, socialAuthReason, socialProviderLabel]);
  const visibleEntryNotice = entryNoticeDismissed ? null : entryNotice;

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError(null);
    setResendSuccess(null);

    try {
      await login(values.email, values.password);
      const loginUserKey = values.email.trim().toLowerCase();
      const latestWorkspaceMemory = await loadWorkspaceMemory(loginUserKey);
      const resumeTarget =
        latestWorkspaceMemory.favoriteRoute ??
        latestWorkspaceMemory.recentRoute ??
        latestWorkspaceMemory.topFocusLane;
      const targetHref = nextPath ?? resumeTarget?.href ?? '/dashboard';

      pushToast({
        title: 'Access granted',
        message: nextRouteLabel
          ? `Reopening ${nextRouteLabel.toLowerCase()} now.`
          : resumeTarget
            ? `Resuming ${getWorkItemLabel(resumeTarget).toLowerCase()} now.`
            : 'Opening your workspace now.',
        tone: 'success',
      });
      router.push(targetHref);
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
    if (hydrated && user?.is_verified) {
      router.replace(nextPath ?? '/dashboard');
    }
  }, [hydrated, nextPath, router, user]);

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
    setEntryNoticeDismissed(false);
  }, [hintedEmail, loginReason, nextPath]);

  useEffect(() => {
    let active = true;

    void loadWorkspaceMemory(memoryUserKey).then((snapshot) => {
      if (active) {
        setWorkspaceMemory(snapshot);
      }
    });

    return () => {
      active = false;
    };
  }, [memoryUserKey]);

  useEffect(() => {
    if (!error) {
      return;
    }

    document.getElementById('login-error-state')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const subscription = form.watch(() => {
      setError(null);
      setEntryNoticeDismissed(true);
    });

    return () => subscription.unsubscribe();
  }, [error, form]);

  const handleResendVerification = async () => {
    if (!normalizedEmail) {
      return;
    }

    setResendLoading(true);
    setResendSuccess(null);

    try {
      const response = await apiClient.resendVerification(normalizedEmail);
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
      <AuthTopbar subtitle="Secure workspace access" primaryHref="/register" primaryLabel="Create account" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10 lg:px-8">
        <div className="w-full">
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
                  Bookings, payments, messages, and delivery stay here.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <InstallCtaButton variant="ghost" />
                  <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    Keep WOLFIX close
                  </span>
                </div>
              </div>
              <div className="mt-8 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Workspace flow</p>
                    <p className="mt-2 font-display text-2xl text-[var(--text-primary)]">Open workspace</p>
                  </div>
                  <div className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                    Secure access
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    { title: 'Bookings', copy: 'Open work.', icon: <BriefcaseBusiness className="size-4" />, tone: 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]' },
                    { title: 'Payments', copy: 'Keep value linked.', icon: <Wallet className="size-4" />, tone: 'bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]' },
                    { title: 'Updates', copy: 'Read context fast.', icon: <MessageSquareMore className="size-4" />, tone: 'bg-[rgba(14,165,233,0.1)] text-[var(--accent-cyan)]' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[18px] border border-[var(--line)] bg-white p-4">
                      <div className={`inline-flex size-9 items-center justify-center rounded-2xl ${item.tone}`}>{item.icon}</div>
                      <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.title}</p>
                      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{item.copy}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { title: 'Protected path', copy: 'Commercial steps stay linked.', icon: <ShieldCheck className="size-4" /> },
                  { title: 'Live updates', copy: 'Replies and alerts stay visible.', icon: <MessageSquareMore className="size-4" /> },
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

              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {[
                  { title: 'Fast access', value: 'Enter', icon: BriefcaseBusiness },
                  { title: 'Protected flow', value: 'Visible', icon: Wallet },
                  { title: 'Support lane', value: 'Ready', icon: ShieldCheck },
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

              <div className="mb-6 space-y-4 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Quick sign-in</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Continue with a trusted provider and we will attach the same workspace session cookies after callback.
                    </p>
                  </div>
                  <span className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                    Recommended
                  </span>
                </div>
                <SocialAuthButtons intent="login" next={nextPath} />
              </div>

              <div className="mb-5 rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-12 items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(147,197,253,0.25)] bg-white shadow-[0_10px_24px_rgba(30,64,175,0.12)]">
                    <Image src="/auth/email.svg" alt="" width={48} height={48} className="size-12 object-cover" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Email access</p>
                      <span className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        Manual route
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Use the same address and password already attached to your workspace account.
                    </p>
                  </div>
                </div>
              </div>

              {resumeRoute ? (
                <div className="mb-6 rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Resume last task</p>
                      <p className="mt-2 font-medium text-[var(--text-primary)]">{getWorkItemLabel(resumeRoute)}</p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {resumeRoute.subtitle ?? 'A saved route is ready for this account. Sign in and continue from there.'}
                      </p>
                      {openReminders.length || topFocusLane ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {openReminders.length ? (
                            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                              {dueTodayCount ? `${dueTodayCount} due today` : `${openReminders.length} reminders open`}
                            </span>
                          ) : null}
                          {topFocusLane ? (
                            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                              Top lane: {topFocusLane.focusCount} hit{topFocusLane.focusCount > 1 ? 's' : ''}
                            </span>
                          ) : null}
                          {nextReminder ? (
                            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                              Next: {getReminderDueLabel(nextReminder.dueAt)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className={`flex size-10 items-center justify-center rounded-2xl ${favoriteRoute ? 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]' : 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]'}`}>
                      {favoriteRoute ? <FavoriteIcon className={`size-4 ${favoriteTone.text}`} /> : <ArrowRight className="size-4" />}
                    </div>
                  </div>
                </div>
              ) : null}

              {visibleEntryNotice ? (
                <div className="mb-6 space-y-3 rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {loginReason ? (
                        <span className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                          {visibleEntryNotice.title}
                        </span>
                      ) : null}
                      {hintedEmail ? (
                        <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                          {hintedEmail}
                        </span>
                      ) : null}
                      {nextRouteLabel ? (
                        <span className="rounded-full border border-[rgba(20,184,166,0.16)] bg-[rgba(240,253,250,0.94)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-teal)]">
                          Return to {nextRouteLabel}
                        </span>
                      ) : null}
                    </div>
                    <Button variant="quiet" size="sm" onClick={() => setEntryNoticeDismissed(true)}>
                      Hide
                    </Button>
                  </div>
                  <FeedbackBanner message={visibleEntryNotice.message} tone={visibleEntryNotice.tone} />
                  <p className="text-sm text-[var(--text-secondary)]">{visibleEntryNotice.actionHint}</p>
                </div>
              ) : null}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  <span className="h-px flex-1 bg-[var(--line)]" />
                  <span>Email and password</span>
                  <span className="h-px flex-1 bg-[var(--line)]" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-secondary)]" htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="you@example.com" {...form.register('email')} />
              <FormHint text="Use the same email address linked to your marketplace account." />
              {form.formState.errors.email ? <p className="text-sm text-rose-600">{form.formState.errors.email.message}</p> : null}
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
              {form.formState.errors.password ? <p className="text-sm text-rose-600">{form.formState.errors.password.message}</p> : null}
            </div>

            {error ? (
              <div id="login-error-state">
                <FeedbackBanner message={error} tone="danger" onDismiss={() => setError(null)} />
              </div>
            ) : null}

            {canResendVerification ? (
              <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(245,158,11,0.16)] bg-[rgba(255,251,235,0.94)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-amber)]">
                    Verify first
                  </span>
                  <span className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                    {normalizedEmail}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  This account still needs email verification. Prepare a fresh link, then come back and sign in once the address is confirmed.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" variant="ghost" onClick={handleResendVerification} disabled={resendLoading}>
                    {resendLoading ? 'Preparing verification link...' : 'Resend verification'}
                  </Button>
                  <Link href="/register">
                    <Button type="button">Open account setup</Button>
                  </Link>
                </div>
                {resendSuccess ? (
                  <div className="mt-4 space-y-3">
                    <FeedbackBanner message={resendSuccess.message} tone="success" />
                    {resendVerificationPageHref ? (
                      <Link href={resendVerificationPageHref}>
                        <Button type="button" variant="ghost">Open fresh verification link</Button>
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

                <Button className="w-full" type="submit" disabled={loading}>
                {loading
                  ? 'Signing in...'
                    : loginActionLabel}
                </Button>
              </form>
            </Card>
          </div>

          <div className="mt-6 grid gap-3 rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.9)] px-5 py-4 text-sm text-[var(--text-secondary)] backdrop-blur-xl sm:grid-cols-3">
            {[
              { title: 'One place', copy: 'Service activity and updates', icon: BriefcaseBusiness },
              { title: 'Protected flow', copy: 'Payment steps stay attached', icon: Wallet },
              { title: 'Clear entry', copy: 'Open the right workspace fast', icon: ShieldCheck },
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

function LoginPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 text-[var(--text-secondary)]">
      Preparing secure access...
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageView />
    </Suspense>
  );
}
