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
  default: 'text-[var(--brand-secondary)]',
  finance: 'text-[#c9d5ff]',
  communication: 'text-[#9fdfff]',
  risk: 'text-[#ffb5cb]',
  guidance: 'text-[#c4d1f5]',
  activity: 'text-[#a7c4ff]',
  market: 'text-[#d5e3ff]',
};

export function SectionHeader({ eyebrow, title, description, actions, className, sticky = false, variant = 'default' }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between',
        sticky &&
          'sticky top-4 z-10 -mx-1 rounded-[24px] border border-[rgba(184,208,255,0.12)] bg-[linear-gradient(180deg,rgba(7,18,37,0.94),rgba(9,24,58,0.88))] px-4 py-4 shadow-[0_16px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl',
        className,
      )}
    >
      <div>
        <p className={cn('text-xs uppercase tracking-[0.22em]', eyebrowToneStyles[variant])}>{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">{title}</h2>
        {description ? <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
