import Link from 'next/link';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

interface FirstSessionStateStep {
  label: string;
  detail: string;
  href: string;
}

interface FirstSessionStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  steps: FirstSessionStateStep[];
  actions?: ReactNode;
}

export function FirstSessionState({
  eyebrow = 'First session',
  title,
  description,
  steps,
  actions,
}: FirstSessionStateProps) {
  return (
    <Card variant="guidance" className="mt-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">{eyebrow}</p>
          <h2 className="mt-3 font-display text-2xl text-[var(--text-primary)]">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <Link
            key={step.label}
            href={step.href}
            className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 transition duration-300 hover:-translate-y-1 hover:bg-[var(--panel-strong)]"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Step {index + 1}</p>
            <p className="mt-3 font-medium text-[var(--text-primary)]">{step.label}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{step.detail}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
