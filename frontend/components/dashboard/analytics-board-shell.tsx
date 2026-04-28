import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface AnalyticsBoardShellProps {
  eyebrow: string;
  title: string;
  description: string;
  snapshotLabel: string;
  children: ReactNode;
  chips?: ReactNode;
  className?: string;
  snapshotClassName?: string;
}

export function AnalyticsBoardShell({
  eyebrow,
  title,
  description,
  snapshotLabel,
  children,
  chips,
  className,
  snapshotClassName,
}: AnalyticsBoardShellProps) {
  return (
    <div
      className={cn(
        'mt-6 rounded-[30px] border border-[var(--line)] bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">{eyebrow}</p>
          <h3 className="mt-2 font-display text-2xl tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div
          className={cn(
            'rounded-full border border-[rgba(99,102,241,0.16)] bg-[rgba(238,242,255,0.94)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--brand-primary)]',
            snapshotClassName,
          )}
        >
          {snapshotLabel}
        </div>
      </div>

      {chips}
      {children}
    </div>
  );
}
