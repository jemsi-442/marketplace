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
  market: 'border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.42),rgba(18,64,134,0.24))]',
  finance: 'border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.42),rgba(32,47,132,0.24))]',
  activity: 'border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.42),rgba(15,63,120,0.24))]',
  guidance: 'border-[rgba(255,151,182,0.18)] bg-[linear-gradient(180deg,rgba(58,18,48,0.32),rgba(108,36,74,0.18))]',
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
    <section className={cn('rounded-[24px] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]', toneClasses[tone], className)}>
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.06)] font-display text-sm tracking-[0.18em] text-[var(--brand-secondary)]">
          {step}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-xl tracking-[-0.02em] text-[var(--text-primary)]">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}
