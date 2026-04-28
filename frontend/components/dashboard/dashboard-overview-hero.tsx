import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardOverviewHeroProps {
  badge: ReactNode;
  title: ReactNode;
  description: ReactNode;
  summary: ReactNode;
  aside: ReactNode;
  className?: string;
  gridClassName?: string;
}

export function DashboardOverviewHero({
  badge,
  title,
  description,
  summary,
  aside,
  className,
  gridClassName = 'xl:grid-cols-[minmax(0,1.35fr)_360px]',
}: DashboardOverviewHeroProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7',
        className,
      )}
    >
      <div className={cn('grid gap-5 lg:gap-7 xl:items-start xl:gap-8', gridClassName)}>
        <div className="min-w-0">
          {badge}
          <div className="mt-4 max-w-4xl font-display text-[2rem] leading-tight tracking-[-0.05em] text-[var(--text-primary)] sm:text-[2.5rem]">
            {title}
          </div>
          <div className="mt-4 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:leading-7">{description}</div>
          <div className="mt-5 sm:mt-6">{summary}</div>
        </div>

        <div className="grid content-start gap-3 sm:gap-4">{aside}</div>
      </div>
    </Card>
  );
}
