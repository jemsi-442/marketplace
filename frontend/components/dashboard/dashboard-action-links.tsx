import type { ReactNode } from 'react';

import Link from 'next/link';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DashboardActionLinkItem {
  href: string;
  label: ReactNode;
  icon?: ReactNode;
  variant?: Extract<ButtonProps['variant'], 'primary' | 'ghost'>;
}

interface DashboardActionLinksProps {
  items: DashboardActionLinkItem[];
  className?: string;
  columnsClassName?: string;
  buttonClassName?: string;
}

export function DashboardActionLinks({
  items,
  className,
  columnsClassName,
  buttonClassName,
}: DashboardActionLinksProps) {
  return (
    <div className={cn('grid gap-3', columnsClassName, className)}>
      {items.map((item) => (
        <Link key={`${item.href}-${String(item.label)}`} href={item.href}>
          <Button
            variant={item.variant === 'ghost' ? 'ghost' : undefined}
            className={cn(
              'h-full w-full justify-between rounded-2xl px-4 py-5',
              item.variant === 'ghost'
                ? 'border border-[var(--line)]'
                : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-strong)]',
              buttonClassName,
            )}
          >
            {item.label}
            {item.icon}
          </Button>
        </Link>
      ))}
    </div>
  );
}
