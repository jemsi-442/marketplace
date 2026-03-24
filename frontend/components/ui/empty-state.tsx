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
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--panel-strong)] text-[var(--brand-secondary)]">
            {icon}
          </div>
          <div>
            <p className="font-display text-xl text-[var(--text-primary)]">{title}</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Card>
  );
}
