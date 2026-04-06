'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, LoaderCircle, MailWarning, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { apiClient } from '@/lib/api/client';
import { toLoginHref } from '@/lib/auth/login-link';
import { toVerificationPageHref } from '@/lib/auth/verification-link';

type VerificationState =
  | { status: 'loading'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const expires = searchParams.get('expires') ?? '';
  const signature = searchParams.get('signature') ?? '';
  const email = searchParams.get('email')?.trim() ?? '';
  const accountType = searchParams.get('type') === 'vendor' ? 'vendor' : searchParams.get('type') === 'client' ? 'client' : null;
  const source = searchParams.get('source') === 'login' ? 'login' : searchParams.get('source') === 'register' ? 'register' : null;
  const [state, setState] = useState<VerificationState>({
    status: 'loading',
    message: 'Checking your verification link...',
  });
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<{ message: string; verificationUrl?: string } | null>(null);

  const roleCopy = accountType === 'vendor'
    ? {
        lane: 'Vendor studio',
        signal: 'Seller lane',
        successCue: 'Your seller account can now open capability lanes, answer live work, and open payout flow.',
        errorCue: 'Once verified, this seller account can move into the studio and continue live work.',
      }
    : {
        lane: 'Client workspace',
        signal: 'Buyer lane',
        successCue: 'Your buyer account can now browse lanes, open protected bookings, and follow delivery.',
        errorCue: 'Once verified, this buyer account can move into the client lane and continue protected work.',
      };

  const hasRequiredParams = useMemo(
    () => token.trim() !== '' && expires.trim() !== '' && signature.trim() !== '',
    [expires, signature, token],
  );

  useEffect(() => {
    if (!hasRequiredParams) {
      setState({
        status: 'error',
        message: 'This verification link is incomplete. Request a fresh verification email and try again.',
      });
      return;
    }

    let active = true;

    apiClient
      .verifyEmail(token, expires, signature)
      .then((response) => {
        if (!active) {
          return;
        }

        setState({
          status: 'success',
          message: response.message || 'Email verified successfully. You can sign in now.',
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Verification link is invalid or expired.',
        });
      });

    return () => {
      active = false;
    };
  }, [expires, hasRequiredParams, signature, token]);

  const isSuccess = state.status === 'success';
  const isLoading = state.status === 'loading';
  const canResendVerification = !isSuccess && !isLoading && email.length > 0;
  const resendVerificationPageHref = toVerificationPageHref(resendSuccess?.verificationUrl, {
    email,
    type: accountType,
    source: source ?? 'login',
  });
  const loginHref = toLoginHref({
    email,
    reason: isSuccess ? 'verified' : 'verify-required',
  });

  const handleResendVerification = async () => {
    if (!email) {
      return;
    }

    setResendLoading(true);
    setResendSuccess(null);

    try {
      const response = await apiClient.resendVerification(email);
      setResendSuccess({
        message: response.message,
        verificationUrl: response.verification_url,
      });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to prepare a new verification link.',
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 lg:px-8">
      <div className="mb-6 flex items-center justify-between rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.94)] px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.94)] shadow-[0_12px_30px_rgba(7,24,84,0.18)]">
            <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={50} height={50} className="h-[50px] w-[50px] object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--brand-secondary)]">WOLFIX DIGITAL AGENCY</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Verification and secure account entry</p>
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

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <div
                className={`flex size-14 items-center justify-center rounded-2xl border border-[var(--line)] shadow-[0_16px_42px_rgba(30,99,219,0.18)] ${
                  isSuccess
                    ? 'bg-[rgba(20,184,166,0.12)] text-[var(--accent-teal)]'
                    : isLoading
                      ? 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]'
                      : 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]'
                }`}
              >
                {isSuccess ? <CheckCircle2 className="size-6" /> : isLoading ? <LoaderCircle className="size-6 animate-spin" /> : <MailWarning className="size-6" />}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--brand-secondary)]">Email verification</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Secure access handoff</p>
              </div>
            </div>
            <h1 className="font-display text-4xl leading-tight">
              {isSuccess ? 'Your email is verified.' : isLoading ? 'Checking your access link.' : 'This link needs attention.'}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)]">
              {isSuccess
                ? roleCopy.successCue
                : isLoading
                  ? 'We are validating the link signature and expiry before opening account access.'
                  : roleCopy.errorCue}
            </p>
          </div>

          <div className="mt-8 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Verification state</p>
                <p className="mt-2 font-display text-2xl text-[var(--text-primary)]">
                  {isSuccess ? 'Entry ready' : isLoading ? 'Checking link' : 'Fresh link needed'}
                </p>
              </div>
              <div className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                {roleCopy.lane}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { title: 'Signed link', copy: 'Expiry cannot be stretched client-side.', icon: <ShieldCheck className="size-4" />, tone: 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]' },
                { title: 'Fresh fallback', copy: 'Request a new email if this one is stale.', icon: <RefreshCcw className="size-4" />, tone: 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]' },
                { title: roleCopy.signal, copy: isSuccess ? 'Continue to sign in.' : 'Return to sign in and resend if needed.', icon: <CheckCircle2 className="size-4" />, tone: 'bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]' },
              ].map((item) => (
                <div key={item.title} className="rounded-[18px] border border-[var(--line)] bg-white p-4">
                  <div className={`inline-flex size-9 items-center justify-center rounded-2xl ${item.tone}`}>{item.icon}</div>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.title}</p>
                  <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-8 lg:p-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Access result</p>
              <h2 className="mt-2 font-display text-3xl">{isSuccess ? 'Verification complete' : isLoading ? 'Validation in progress' : 'Verification blocked'}</h2>
            </div>
          </div>

          <div className="space-y-4">
            <FeedbackBanner
              message={state.message}
              tone={isSuccess ? 'success' : isLoading ? 'info' : 'warning'}
            />

            <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">What to do next</p>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                {isSuccess
                  ? 'Go to sign in and open your workspace. If you were already on the sign-in page, return there now.'
                  : isLoading
                    ? 'Stay on this page for a moment while we complete the verification check.'
                    : source === 'register'
                      ? 'Return to sign in when ready, or prepare a fresh verification link right here if the first one has gone stale.'
                      : 'Return to sign in, enter the same email, and use resend verification to prepare a fresh link.'}
              </p>
              {email ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                    {email}
                  </span>
                  <span className="rounded-full border border-[rgba(20,184,166,0.16)] bg-[rgba(240,253,250,0.94)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-teal)]">
                    {roleCopy.lane}
                  </span>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={loginHref}>
                  <Button>{isSuccess ? 'Sign in now' : 'Go to sign in'}</Button>
                </Link>
                <Link href="/register">
                  <Button variant="ghost">Back to account setup</Button>
                </Link>
                {canResendVerification ? (
                  <Button type="button" variant="ghost" onClick={handleResendVerification} disabled={resendLoading}>
                    {resendLoading ? 'Preparing fresh verification link...' : 'Resend verification'}
                  </Button>
                ) : null}
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
        </Card>
      </div>
    </main>
  );
}
