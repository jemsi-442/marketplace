'use client';

import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

import { buildSocialAuthStartHref, type SocialAuthIntent, type SocialAuthRole } from '@/lib/auth/social-auth';

interface SocialAuthButtonsProps {
  intent: SocialAuthIntent;
  role?: SocialAuthRole | null;
  next?: string | null;
  className?: string;
}

interface ProviderCardDefinition {
  id: 'google' | 'github';
  label: string;
  markSrc: string;
}

export function SocialAuthButtons({ intent, role, next, className }: SocialAuthButtonsProps) {
  const providers: ProviderCardDefinition[] = [
    {
      id: 'google',
      label: intent === 'register' ? 'Continue with Google' : 'Sign in with Google',
      markSrc: '/auth/google.svg',
    },
    {
      id: 'github',
      label: intent === 'register' ? 'Continue with GitHub' : 'Sign in with GitHub',
      markSrc: '/auth/github.svg',
    },
  ];

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map(({ id, label, markSrc }) => (
          <button
            key={id}
            type="button"
            className="group flex min-h-[84px] w-full items-center gap-4 rounded-[22px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_22px_40px_rgba(15,23,42,0.12)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            onClick={() => {
              window.location.href = buildSocialAuthStartHref(id, { intent, role, next });
            }}
          >
            <span className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(148,163,184,0.16)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <Image src={markSrc} alt="" width={48} height={48} className="size-12 object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="block text-sm font-semibold leading-6 text-[var(--text-primary)]">{label}</span>
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-[var(--text-tertiary)] transition group-hover:text-[var(--brand-primary)]" />
              </span>
              <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {id === 'google' ? 'Google account' : 'GitHub account'}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
