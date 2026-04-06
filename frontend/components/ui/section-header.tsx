import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  sticky?: boolean;
  variant?: 'default' | 'finance' | 'communication' | 'risk' | 'guidance' | 'activity' | 'market';
}

const eyebrowToneStyles: Record<NonNullable<SectionHeaderProps['variant']>, string> = {
  default: 'text-[var(--brand-primary)]',
  finance: 'text-[var(--accent-teal)]',
  communication: 'text-[var(--accent-violet)]',
  risk: 'text-[#ffb5b5]',
  guidance: 'text-[var(--accent-slate)]',
  activity: 'text-[var(--accent-cyan)]',
  market: 'text-[var(--accent-amber)]',
};

export function SectionHeader({ eyebrow, title, description, actions, className, sticky = false, variant = 'default' }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between',
        sticky &&
          'sticky top-4 z-10 -mx-1 rounded-[22px] border border-[var(--line)] bg-[rgba(255,255,255,0.9)] px-3 py-3 shadow-[0_16px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[24px] sm:px-4 sm:py-4',
        className,
      )}
    >
      <div>
        <p className={cn('text-xs uppercase tracking-[0.22em]', eyebrowToneStyles[variant])}>{eyebrow}</p>
        <h2 className="mt-2 font-display text-[1.45rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)] sm:text-[1.75rem]">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[var(--text-secondary)] sm:text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 sm:gap-3">{actions}</div> : null}
    </div>
  );
}
