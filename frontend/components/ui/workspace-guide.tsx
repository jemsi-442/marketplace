import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

interface WorkspaceGuideProps {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  tip?: string;
  actions?: ReactNode;
}

export function WorkspaceGuide({ eyebrow, title, description, points, tip, actions }: WorkspaceGuideProps) {
  return (
    <Card>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">{eyebrow}</p>
          <h2 className="mt-3 font-display text-2xl text-[var(--text-primary)]">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {points.map((point, index) => (
          <div key={`${index}-${point}`} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{point}</p>
          </div>
        ))}
      </div>

      {tip ? (
        <div className="mt-5 rounded-[20px] border border-[var(--line)] bg-[rgba(47,107,255,0.1)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">What matters now:</span> {tip}
        </div>
      ) : null}
    </Card>
  );
}
