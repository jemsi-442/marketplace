'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, ShieldCheck, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AuthUser } from '@/lib/types';

interface OnboardingChecklistProps {
  user: AuthUser | null;
}

function resolveLaneActionLabel(href: string): string {
  if (href.includes('/dashboard/admin')) {
    return 'Open operations desk';
  }

  if (href.includes('/dashboard/vendor')) {
    return 'Open vendor studio';
  }

  if (href.includes('/dashboard/client')) {
    return 'Open client lane';
  }

  if (href.includes('/dashboard/notifications')) {
    return 'Open alerts lane';
  }

  if (href.includes('/dashboard/communications')) {
    return 'Open inbox lane';
  }

  return 'Open next lane';
}

function resolveChecklist(user: AuthUser | null) {
  const isAdmin = user?.roles.includes('ROLE_ADMIN') ?? false;
  const isVendor = user?.roles.includes('ROLE_VENDOR') ?? false;

  if (isAdmin) {
    return {
      key: 'admin',
      title: 'First time in the operations desk?',
      description: 'Start with the platform-wide view before taking action on disputes, risk, or user controls.',
      steps: [
        { label: 'Review health and trend signals', href: '/dashboard/admin' },
        { label: 'Check disputes that need a decision', href: '/dashboard/admin' },
        { label: 'Inspect watchlists before taking user action', href: '/dashboard/admin' },
      ],
    };
  }

  if (isVendor) {
    return {
      key: 'vendor',
      title: 'First time in the capability studio?',
      description: 'Use this checklist to set up your presence before focusing on delivery and earnings.',
      steps: [
        { label: 'Complete your business profile', href: '/dashboard/vendor' },
        { label: 'Activate your first capability', href: '/dashboard/vendor-capabilities' },
        { label: 'Watch for new bookings and messages', href: '/dashboard/notifications' },
      ],
    };
  }

  return {
    key: 'client',
    title: 'First time in the bookings workspace?',
    description: 'This checklist helps you move from browsing to a protected booking without guessing.',
    steps: [
      { label: 'Browse business lanes', href: '/dashboard/request-services' },
      { label: 'Open your first lane request', href: '/dashboard/request-services' },
      { label: 'Track alerts and replies', href: '/dashboard/notifications' },
    ],
  };
}

export function OnboardingChecklist({ user }: OnboardingChecklistProps) {
  const checklist = useMemo(() => resolveChecklist(user), [user]);
  const storageKey = `wolfix:onboarding-dismissed:${checklist.key}`;
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    queueMicrotask(() => {
      setDismissed(saved === '1');
    });
  }, [storageKey]);

  if (dismissed === null || dismissed) {
    return null;
  }

  const stepIcons = [Compass, Sparkles, ShieldCheck];

  return (
    <Card>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Getting started</p>
          <h2 className="mt-3 font-display text-2xl text-[var(--text-primary)]">{checklist.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{checklist.description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            window.localStorage.setItem(storageKey, '1');
            setDismissed(true);
          }}
        >
          Hide this
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {checklist.steps.map((step, index) => {
          const Icon = stepIcons[index] ?? Sparkles;

          return (
            <Link
              key={step.label}
              href={step.href}
              className="rounded-[22px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Step {index + 1}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{step.label}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(79,70,229,0.12)] bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]">
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--brand-secondary)]">
                {resolveLaneActionLabel(step.href)}
                <ArrowRight className="size-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
