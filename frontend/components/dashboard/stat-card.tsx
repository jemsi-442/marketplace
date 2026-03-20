import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

interface StatCardProps {
  eyebrow: string;
  value: string;
  detail: string;
  icon: ReactNode;
}

export function StatCard({ eyebrow, value, detail, icon }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-6 -top-6 flex size-20 items-center justify-center rounded-full bg-[rgba(204,184,122,0.12)] text-[var(--brand-primary)]">
        {icon}
      </div>
      <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{eyebrow}</p>
      <p className="font-display text-4xl text-[var(--text-primary)]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
    </Card>
  );
}
