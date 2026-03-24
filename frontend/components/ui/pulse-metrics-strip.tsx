import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

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

export function PulseMetricsStrip({ title, description, items, className }: PulseMetricsStripProps) {
  return (
    <div className={className}>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Workspace pulse</p>
        <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={`${item.label}-${item.value}`} variant={item.variant ?? 'default'}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{item.label}</p>
                <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.detail}</p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.06)] text-[var(--brand-secondary)]">
                {item.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
