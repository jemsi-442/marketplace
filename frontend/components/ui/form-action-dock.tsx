import { type PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

interface FormActionDockProps extends PropsWithChildren {
  title: string;
  hint: string;
  className?: string;
}

export function FormActionDock({ title, hint, className, children }: FormActionDockProps) {
  return (
    <div
      className={cn(
        'sticky bottom-4 z-10 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-secondary)]">{title}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{hint}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {children}
        </div>
      </div>
    </div>
  );
}
