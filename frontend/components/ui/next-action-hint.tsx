import type { ReactNode } from 'react';

interface NextActionHintProps {
  label: string;
  action?: ReactNode;
  prefix?: string;
}

export function NextActionHint({ label, action, prefix = 'Recommended now:' }: NextActionHintProps) {
  return (
    <div className="mt-4 rounded-[18px] border border-[rgba(99,102,241,0.14)] bg-[rgba(238,242,255,0.94)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="leading-5">
          <span className="font-medium text-[var(--text-primary)]">{prefix}</span> {label}
        </p>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
