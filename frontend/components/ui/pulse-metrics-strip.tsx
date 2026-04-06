import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PulseMetricItem {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  variant?: 'default' | 'finance' | 'communication' | 'risk' | 'guidance' | 'activity' | 'market';
}

interface PulseMetricsStripProps {
  title: string;
  description: string;
  items: PulseMetricItem[];
  className?: string;
}

const iconShells: Record<NonNullable<PulseMetricItem['variant']>, string> = {
  default: 'bg-[rgba(159,176,216,0.12)] text-[var(--accent-slate)]',
  finance: 'bg-[rgba(95,214,179,0.12)] text-[var(--accent-teal)]',
  communication: 'bg-[rgba(188,164,255,0.12)] text-[var(--accent-violet)]',
  risk: 'bg-[rgba(255,143,143,0.12)] text-[var(--accent-coral)]',
  guidance: 'bg-[rgba(159,176,216,0.12)] text-[var(--accent-slate)]',
  activity: 'bg-[rgba(111,215,255,0.12)] text-[var(--accent-cyan)]',
  market: 'bg-[rgba(242,198,109,0.12)] text-[var(--accent-amber)]',
};

export function PulseMetricsStrip({ title, description, items, className }: PulseMetricsStripProps) {
  return (
    <div className={className}>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Workspace pulse</p>
        <h2 className="mt-2 font-display text-[1.45rem] tracking-[-0.03em] text-[var(--text-primary)] sm:text-2xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[var(--text-secondary)] sm:text-sm sm:leading-7">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={`${item.label}-${item.value}`} variant={item.variant ?? 'default'}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{item.label}</p>
                <p className="mt-2.5 font-display text-[1.6rem] text-[var(--text-primary)] sm:mt-3 sm:text-3xl">{item.value}</p>
                <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)] sm:text-sm">{item.detail}</p>
              </div>
              <div className={cn('flex size-10 items-center justify-center rounded-2xl sm:size-11', iconShells[item.variant ?? 'default'])}>
                {item.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
