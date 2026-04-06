import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <div className="pointer-events-none absolute right-4 top-4">
        <div className="relative h-20 w-20">
          <span className="absolute inset-0 rounded-full bg-[rgba(79,70,229,0.08)] blur-xl" />
          <span className="absolute right-1 top-1 size-8 rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(255,255,255,0.82)]" />
          <span className="absolute bottom-1 left-1 size-5 rounded-full border border-[rgba(56,189,248,0.16)] bg-[rgba(240,249,255,0.92)]" />
          <div className="absolute bottom-0 right-0 flex items-end gap-1 rounded-[14px] border border-[var(--line)] bg-[rgba(255,255,255,0.9)] px-2 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
            <span className="h-3 w-1.5 rounded-full bg-[rgba(79,70,229,0.38)]" />
            <span className="h-5 w-1.5 rounded-full bg-[rgba(56,189,248,0.5)]" />
            <span className="h-7 w-1.5 rounded-full bg-[rgba(20,184,166,0.5)]" />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] text-[var(--brand-secondary)] shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            {icon}
          </div>
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              <span className="size-2 rounded-full bg-[var(--brand-primary)]" />
              Ready when work appears
            </div>
            <p className="font-display text-xl text-[var(--text-primary)]">{title}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Card>
  );
}
