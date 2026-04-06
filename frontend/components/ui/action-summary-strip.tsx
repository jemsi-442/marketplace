import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ActionSummaryItem {
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
  return (
    <div className={cn('rounded-[26px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.96))] p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)]', className)}>
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-primary)]">Action summary</p>
      <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={`${item.eyebrow}-${index}`}
            className={cn('rounded-[22px] border p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)] animate-fade-up-delayed', toneClasses[item.tone ?? 'guidance'])}
            style={{ ['--stagger-delay' as string]: `${index * 45}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
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
