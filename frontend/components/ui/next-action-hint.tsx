import type { ReactNode } from 'react';

interface NextActionHintProps {
  label: string;
  action?: ReactNode;
  prefix?: string;
}

export function NextActionHint({ label, action, prefix = 'Recommended now:' }: NextActionHintProps) {
  return (
    <div className="mt-4 rounded-[18px] border border-[var(--line)] bg-[rgba(47,107,255,0.1)] px-4 py-3 text-sm text-[var(--text-secondary)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p>
          <span className="font-medium text-[var(--text-primary)]">{prefix}</span> {label}
        </p>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
