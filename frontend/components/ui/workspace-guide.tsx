import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

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
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-primary)]">{eyebrow}</p>
          <h2 className="mt-3 font-display text-[1.75rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {points.map((point, index) => (
          <div key={`${index}-${point}`} className="rounded-[22px] border border-[var(--line)] bg-[rgba(248,250,252,0.96)] px-4 py-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[rgba(99,102,241,0.12)] text-[var(--brand-primary)]">
                <CheckCircle2 className="size-4" />
              </span>
              <p className="text-sm leading-5 text-[var(--text-secondary)]">{point}</p>
            </div>
          </div>
        ))}
      </div>

      {tip ? (
        <div className="mt-5 rounded-[20px] border border-[rgba(99,102,241,0.14)] bg-[rgba(238,242,255,0.92)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)] shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <span className="font-medium text-[var(--text-primary)]">What matters now:</span> {tip}
        </div>
      ) : null}
    </Card>
  );
}
