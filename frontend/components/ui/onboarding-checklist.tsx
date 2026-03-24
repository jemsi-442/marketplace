'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AuthUser } from '@/lib/types';

interface OnboardingChecklistProps {
  user: AuthUser | null;
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
      title: 'First time in the service studio?',
      description: 'Use this checklist to set up your presence before focusing on delivery and earnings.',
      steps: [
        { label: 'Complete your business profile', href: '/dashboard/vendor' },
        { label: 'Create your first service listing', href: '/dashboard/vendor' },
        { label: 'Watch for new bookings and messages', href: '/dashboard/notifications' },
      ],
    };
  }

  return {
    key: 'client',
    title: 'First time in the bookings workspace?',
    description: 'This checklist helps you move from browsing to a protected booking without guessing.',
    steps: [
      { label: 'Browse the service catalog', href: '/dashboard/client' },
      { label: 'Create your first booking', href: '/dashboard/client' },
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
        {checklist.steps.map((step, index) => (
          <Link key={step.label} href={step.href} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 transition hover:bg-[var(--panel-strong)]">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Step {index + 1}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{step.label}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
