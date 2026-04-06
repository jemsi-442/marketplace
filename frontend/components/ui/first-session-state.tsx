import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Compass, Flag, ShieldCheck } from 'lucide-react';

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

export function FirstSessionState({
  eyebrow = 'First session',
  title,
  description,
  steps,
  actions,
}: FirstSessionStateProps) {
  const stepIcons = [Compass, ShieldCheck, Flag];

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
        {steps.map((step, index) => {
          const Icon = stepIcons[index] ?? Flag;

          return (
            <Link
              key={step.label}
              href={step.href}
              className="rounded-[22px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Step {index + 1}</p>
                  <p className="mt-3 font-medium text-[var(--text-primary)]">{step.label}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(79,70,229,0.12)] bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]">
                  <Icon className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{step.detail}</p>
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
