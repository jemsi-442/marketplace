'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FirstLoginWelcomeProps {
  storageKey: string;
  title: string;
  description: string;
  highlights: string[];
  actions?: ReactNode;
}

export function FirstLoginWelcome({
  storageKey,
  title,
  description,
  highlights,
  actions,
}: FirstLoginWelcomeProps) {
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
    <Card variant="guidance" className="mt-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Welcome back</p>
          <h2 className="mt-3 font-display text-2xl text-[var(--text-primary)]">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {actions}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.localStorage.setItem(storageKey, '1');
              setDismissed(true);
            }}
          >
            Dismiss
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {highlights.map((highlight, index) => (
          <div
            key={highlight}
            className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Focus {index + 1}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{highlight}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
