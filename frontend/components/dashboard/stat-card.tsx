import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  eyebrow: string;
  value: string;
  detail: string;
  icon: ReactNode;
  variant?: 'default' | 'finance' | 'communication' | 'risk' | 'guidance' | 'activity' | 'market';
}

const statCardIconShells: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'bg-[linear-gradient(135deg,rgba(65,205,189,0.28),rgba(10,62,58,0.18))]',
  finance: 'bg-[linear-gradient(135deg,rgba(135,145,255,0.34),rgba(38,44,124,0.22))]',
  communication: 'bg-[linear-gradient(135deg,rgba(110,218,255,0.28),rgba(8,78,126,0.22))]',
  risk: 'bg-[linear-gradient(135deg,rgba(255,129,170,0.3),rgba(105,22,62,0.22))]',
  guidance: 'bg-[linear-gradient(135deg,rgba(184,198,255,0.26),rgba(44,60,116,0.2))]',
  activity: 'bg-[linear-gradient(135deg,rgba(96,151,255,0.34),rgba(20,58,130,0.22))]',
  market: 'bg-[linear-gradient(135deg,rgba(134,180,255,0.3),rgba(25,66,138,0.22))]',
};

export function StatCard({ eyebrow, value, detail, icon, variant = 'default' }: StatCardProps) {
  return (
    <Card variant={variant} className="relative overflow-hidden">
      <div className={cn('absolute -right-6 -top-6 flex size-20 items-center justify-center rounded-full text-white', statCardIconShells[variant])}>
        {icon}
      </div>
      <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{eyebrow}</p>
      <p className="font-display text-4xl text-[var(--text-primary)]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
    </Card>
  );
}
