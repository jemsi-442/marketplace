import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface ActionSummaryItem {
  eyebrow: string;
  value: string;
  detail: string;
  icon?: ReactNode;
  tone?: 'finance' | 'activity' | 'guidance';
}

interface ActionSummaryStripProps {
  title: string;
  items: ActionSummaryItem[];
  className?: string;
}

const toneClasses: Record<NonNullable<ActionSummaryItem['tone']>, string> = {
  finance: 'border-[rgba(45,180,138,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.96))] shadow-[0_14px_30px_rgba(15,23,42,0.05)]',
  activity: 'border-[rgba(56,189,248,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,249,255,0.96))] shadow-[0_14px_30px_rgba(15,23,42,0.05)]',
  guidance: 'border-[rgba(99,102,241,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,255,0.96))] shadow-[0_14px_30px_rgba(15,23,42,0.05)]',
};

export function ActionSummaryStrip({ title, items, className }: ActionSummaryStripProps) {
  const gridClassName =
    items.length >= 4
      ? 'sm:grid-cols-2 2xl:grid-cols-4'
      : items.length === 3
        ? 'sm:grid-cols-2 xl:grid-cols-3'
        : items.length === 2
          ? 'sm:grid-cols-2'
          : '';

  return (
    <div className={cn('relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.96))] p-4 shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:p-5 lg:p-6', className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),rgba(255,255,255,0)_72%)]" />
      <div className="pointer-events-none absolute left-5 top-0 h-1.5 w-24 rounded-b-full bg-[linear-gradient(90deg,rgba(99,102,241,0.34),var(--brand-primary))] shadow-[0_12px_24px_rgba(99,102,241,0.18)]" />

      <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-primary)]">Action summary</p>
          <h2 className="mt-2 font-display text-[1.55rem] leading-tight text-[var(--text-primary)] sm:text-2xl">{title}</h2>
        </div>
        <div className="w-fit rounded-full border border-[rgba(99,102,241,0.16)] bg-[rgba(255,255,255,0.8)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--brand-primary)] shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
          Priority strip
        </div>
      </div>
      <div className={cn('mt-5 grid gap-4', gridClassName)}>
        {items.map((item, index) => (
          <div
            key={`${item.eyebrow}-${index}`}
            className={cn('relative overflow-hidden rounded-[22px] border p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)] animate-fade-up-delayed', toneClasses[item.tone ?? 'guidance'])}
            style={{ ['--stagger-delay' as string]: `${index * 45}ms` }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent)]" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.eyebrow}</p>
                <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{item.value}</p>
              </div>
              {item.icon ? <div className="rounded-full border border-[var(--line)] bg-white/90 p-2 text-[var(--brand-primary)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]">{item.icon}</div> : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
