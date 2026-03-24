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
  finance: 'border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.68),rgba(32,47,132,0.46))]',
  activity: 'border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.68),rgba(15,63,120,0.46))]',
  guidance: 'border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)]',
};

export function ActionSummaryStrip({ title, items, className }: ActionSummaryStripProps) {
  return (
    <div className={cn('rounded-[26px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(10,24,70,0.86),rgba(16,38,96,0.72))] p-5 shadow-[var(--shadow-soft)]', className)}>
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Action summary</p>
      <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={`${item.eyebrow}-${index}`}
            className={cn('rounded-[22px] border p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed', toneClasses[item.tone ?? 'guidance'])}
            style={{ ['--stagger-delay' as string]: `${index * 45}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.eyebrow}</p>
                <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{item.value}</p>
              </div>
              {item.icon ? <div className="text-[var(--brand-secondary)]">{item.icon}</div> : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
