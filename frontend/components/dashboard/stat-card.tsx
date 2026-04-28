import type { ReactNode } from 'react';

import { accentToRgba } from '@/components/dashboard/chart-utils';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
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

const statCardAccents: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'var(--brand-primary)',
  finance: 'var(--accent-teal)',
  communication: 'var(--accent-violet)',
  risk: '#e11d48',
  guidance: 'var(--accent-slate)',
  activity: 'var(--accent-cyan)',
  market: 'var(--accent-amber)',
};

export function StatCard({ eyebrow, value, detail, icon, variant = 'default' }: StatCardProps) {
  const accent = statCardAccents[variant];

  return (
    <Card variant={variant} className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background: `radial-gradient(circle at top right, ${accentToRgba(accent, 0.18)} 0%, rgba(255,255,255,0) 72%)`,
        }}
      />
      <div
        className="pointer-events-none absolute left-4 top-0 h-1.5 w-20 rounded-b-full"
        style={{
          background: `linear-gradient(90deg, ${accentToRgba(accent, 0.34)} 0%, ${accent} 100%)`,
          boxShadow: `0 12px 24px ${accentToRgba(accent, 0.18)}`,
        }}
      />
      <div className="absolute right-3 top-3 rounded-full border border-[var(--line)] bg-white/92 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[var(--text-tertiary)] shadow-[0_8px_18px_rgba(15,23,42,0.05)] sm:right-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-[10px]">
        Live signal
      </div>
      <div className={cn('relative z-[1] mb-3 flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:mb-4 sm:size-12', statCardIconShells[variant])}>
        {icon}
      </div>
      <p className="relative z-[1] mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{eyebrow}</p>
      <p className="relative z-[1] max-w-[16rem] font-display text-[1.72rem] leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[2rem] lg:text-[2.15rem]">{value}</p>
      <div className="relative z-[1] mt-3 h-[3px] w-20 rounded-full bg-[rgba(255,255,255,0.72)]">
        <div
          className="h-[3px] rounded-full"
          style={{
            width: '100%',
            background: `linear-gradient(90deg, ${accentToRgba(accent, 0.56)} 0%, ${accent} 100%)`,
          }}
        />
      </div>
      <p className="relative z-[1] mt-3 max-w-[18rem] text-[13px] leading-6 text-[var(--text-secondary)] sm:text-sm">{detail}</p>
    </Card>
  );
}
