import type { ReactNode } from 'react';
import { BadgeDollarSign, BriefcaseBusiness, ShieldAlert, Sparkles, Waypoints } from 'lucide-react';

import { cn } from '@/lib/utils';

type PriorityBannerTone = 'guidance' | 'market' | 'finance' | 'risk' | 'activity' | 'communication';

const toneStyles: Record<PriorityBannerTone, string> = {
  guidance: 'border-[rgba(99,102,241,0.14)] bg-[linear-gradient(180deg,rgba(238,242,255,0.96),rgba(248,250,252,0.98))]',
  market: 'border-[rgba(245,158,11,0.16)] bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))]',
  finance: 'border-[rgba(20,184,166,0.16)] bg-[linear-gradient(180deg,rgba(240,253,250,0.96),rgba(255,255,255,0.98))]',
  risk: 'border-[rgba(249,115,22,0.16)] bg-[linear-gradient(180deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))]',
  activity: 'border-[rgba(56,189,248,0.16)] bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))]',
  communication: 'border-[rgba(139,92,246,0.16)] bg-[linear-gradient(180deg,rgba(245,243,255,0.96),rgba(255,255,255,0.98))]',
};

const toneIconMap: Record<PriorityBannerTone, typeof Sparkles> = {
  guidance: Sparkles,
  market: BriefcaseBusiness,
  finance: BadgeDollarSign,
  risk: ShieldAlert,
  activity: Waypoints,
  communication: Sparkles,
};

const toneIconShells: Record<PriorityBannerTone, string> = {
  guidance: 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]',
  market: 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]',
  finance: 'bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]',
  risk: 'bg-[rgba(251,113,133,0.12)] text-rose-600',
  activity: 'bg-[rgba(14,165,233,0.1)] text-[var(--accent-cyan)]',
  communication: 'bg-[rgba(139,92,246,0.1)] text-[var(--accent-violet)]',
};

interface PriorityBannerProps {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: PriorityBannerTone;
  actions?: ReactNode;
  className?: string;
}

export function PriorityBanner({
  eyebrow = 'Needs attention first',
  title,
  description,
  tone = 'guidance',
  actions,
  className,
}: PriorityBannerProps) {
  const Icon = toneIconMap[tone];

  return (
    <div
      className={cn(
        'rounded-[28px] border px-6 py-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]',
        toneStyles[tone],
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className={cn('inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.74)]', toneIconShells[tone])}>
              <Icon className="size-4" />
            </span>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{eyebrow}</p>
          </div>
          <h2 className="mt-4 font-display text-[1.75rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3 lg:max-w-xl lg:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
