import type { ReactNode } from 'react';

import { accentToRgba } from '@/components/dashboard/chart-utils';
import { cn } from '@/lib/utils';

interface AnalyticsSectionCardProps {
  title: string;
  description?: string;
  chip?: string;
  accent: string;
  children: ReactNode;
  className?: string;
}

export function AnalyticsSectionCard({
  title,
  description,
  chip,
  accent,
  children,
  className,
}: AnalyticsSectionCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[26px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] animate-fade-up',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          background: `radial-gradient(circle at top right, ${accentToRgba(accent, 0.16)} 0%, rgba(255,255,255,0) 72%)`,
        }}
      />
      <div
        className="pointer-events-none absolute left-5 top-0 h-1.5 w-28 rounded-b-full"
        style={{
          background: `linear-gradient(90deg, ${accentToRgba(accent, 0.35)} 0%, ${accent} 100%)`,
          boxShadow: `0 12px 24px ${accentToRgba(accent, 0.22)}`,
        }}
      />

      <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Analytics module</p>
          </div>
          <h3 className="mt-3 font-display text-[1.4rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)] sm:text-[1.55rem]">{title}</h3>
          {description ? <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p> : null}
        </div>
        {chip ? (
          <div
            className="w-fit rounded-full border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{
              borderColor: accentToRgba(accent, 0.18),
              backgroundColor: accentToRgba(accent, 0.08),
              color: accent,
            }}
          >
            {chip}
          </div>
        ) : null}
      </div>

      <div className="relative z-[1] mt-5">{children}</div>
    </div>
  );
}
