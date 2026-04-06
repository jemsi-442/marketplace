import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  eyebrow: string;
  value: string;
  detail: string;
  icon: ReactNode;
  variant?: 'default' | 'finance' | 'communication' | 'risk' | 'guidance' | 'activity' | 'market';
}

const statCardIconShells: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]',
  finance: 'bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]',
  communication: 'bg-[rgba(139,92,246,0.1)] text-[var(--accent-violet)]',
  risk: 'bg-[rgba(251,113,133,0.12)] text-rose-600',
  guidance: 'bg-[rgba(148,163,184,0.12)] text-[var(--accent-slate)]',
  activity: 'bg-[rgba(14,165,233,0.1)] text-[var(--accent-cyan)]',
  market: 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]',
};

export function StatCard({ eyebrow, value, detail, icon, variant = 'default' }: StatCardProps) {
  return (
    <Card variant={variant} className="relative overflow-hidden">
      <div className="absolute right-3 top-3 rounded-full border border-[var(--line)] bg-white/92 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[var(--text-tertiary)] shadow-[0_8px_18px_rgba(15,23,42,0.05)] sm:right-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-[10px]">
        Signal
      </div>
      <div className={cn('mb-3 flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:mb-4 sm:size-12', statCardIconShells[variant])}>
        {icon}
      </div>
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{eyebrow}</p>
      <p className="max-w-[16rem] font-display text-[1.65rem] leading-tight text-[var(--text-primary)] sm:text-3xl lg:text-[2rem]">{value}</p>
      <p className="mt-2.5 max-w-[18rem] text-[13px] leading-6 text-[var(--text-secondary)] sm:mt-3 sm:text-sm">{detail}</p>
    </Card>
  );
}
