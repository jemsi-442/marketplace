import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface DashboardHeroBadgeProps {
  icon: ReactNode;
  label: string;
  className?: string;
}

export function DashboardHeroBadge({
  icon,
  label,
  className,
}: DashboardHeroBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em]',
        className,
      )}
    >
      {icon}
      {label}
    </div>
  );
}
