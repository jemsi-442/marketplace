import { type PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

interface FormSectionProps extends PropsWithChildren {
  step: string;
  title: string;
  description: string;
  tone?: 'market' | 'finance' | 'activity' | 'guidance';
  className?: string;
}

const toneClasses: Record<NonNullable<FormSectionProps['tone']>, string> = {
  market: 'border-[rgba(245,158,11,0.16)] bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))]',
  finance: 'border-[rgba(20,184,166,0.16)] bg-[linear-gradient(180deg,rgba(240,253,250,0.96),rgba(255,255,255,0.98))]',
  activity: 'border-[rgba(56,189,248,0.16)] bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))]',
  guidance: 'border-[rgba(99,102,241,0.14)] bg-[linear-gradient(180deg,rgba(245,243,255,0.96),rgba(255,255,255,0.98))]',
};

export function FormSection({
  children,
  className,
  description,
  step,
  title,
  tone = 'activity',
}: FormSectionProps) {
  return (
    <section className={cn('rounded-[24px] border p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]', toneClasses[tone], className)}>
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-white font-display text-sm tracking-[0.18em] text-[var(--brand-primary)]">
          {step}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-xl tracking-[-0.02em] text-[var(--text-primary)]">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-5 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}
