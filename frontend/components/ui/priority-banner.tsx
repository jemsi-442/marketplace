import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

type PriorityBannerTone = 'guidance' | 'market' | 'finance' | 'risk' | 'activity' | 'communication';

const toneStyles: Record<PriorityBannerTone, string> = {
  guidance: 'border-[rgba(170,180,255,0.22)] bg-[linear-gradient(180deg,rgba(20,26,84,0.72),rgba(32,47,132,0.52))]',
  market: 'border-[rgba(123,165,255,0.22)] bg-[linear-gradient(180deg,rgba(14,33,70,0.72),rgba(24,52,108,0.52))]',
  finance: 'border-[rgba(166,176,255,0.22)] bg-[linear-gradient(180deg,rgba(20,26,84,0.78),rgba(32,47,132,0.56))]',
  risk: 'border-[rgba(255,151,182,0.22)] bg-[linear-gradient(180deg,rgba(58,18,48,0.72),rgba(108,36,74,0.54))]',
  activity: 'border-[rgba(124,194,255,0.22)] bg-[linear-gradient(180deg,rgba(8,42,86,0.72),rgba(15,63,120,0.54))]',
  communication: 'border-[rgba(124,194,255,0.22)] bg-[linear-gradient(180deg,rgba(8,42,86,0.72),rgba(15,63,120,0.54))]',
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
  return (
    <div
      className={cn(
        'rounded-[28px] border px-6 py-5 shadow-[0_26px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl',
        toneStyles[tone],
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)]">
              <Sparkles className="size-4" />
            </span>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{eyebrow}</p>
          </div>
          <h2 className="mt-4 font-display text-2xl text-[var(--text-primary)]">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3 lg:max-w-xl lg:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
