import type { ReactNode } from 'react';

import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface JourneyStripStep {
  label: string;
  detail: string;
  icon: ReactNode;
  toneClass: string;
}

interface JourneyStripProps {
  eyebrow: string;
  title: string;
  steps: JourneyStripStep[];
  className?: string;
}

export function JourneyStrip({ eyebrow, title, steps, className }: JourneyStripProps) {
  return (
    <div className={cn('rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]', className)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-secondary)]">{eyebrow}</p>
      <p className="mt-2 font-display text-xl text-[var(--text-primary)]">{title}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.label} className="rounded-[20px] border border-[var(--line)] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className={`flex size-10 items-center justify-center rounded-2xl ${step.toneClass}`}>
                {step.icon}
              </div>
              {index < steps.length - 1 ? (
                <div className="hidden items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)] lg:inline-flex">
                  Next
                  <ArrowRight className="size-3.5" />
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{step.label}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{step.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
