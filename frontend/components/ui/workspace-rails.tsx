import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface WorkspaceRailsProps extends HTMLAttributes<HTMLDivElement> {
  primary: ReactNode;
  support: ReactNode;
  primaryClassName?: string;
  supportClassName?: string;
}

export function WorkspaceRails({
  primary,
  support,
  className,
  primaryClassName,
  supportClassName,
  ...props
}: WorkspaceRailsProps) {
  return (
    <div
      className={cn(
        'mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] xl:items-start',
        className,
      )}
      {...props}
    >
      <div className={cn('space-y-6', primaryClassName)}>{primary}</div>
      <aside className={cn('space-y-6 xl:sticky xl:top-24', supportClassName)}>{support}</aside>
    </div>
  );
}
