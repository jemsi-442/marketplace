import type { ReactNode } from 'react';

import Link from 'next/link';

import { accentToRgba } from '@/components/dashboard/chart-utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface WorkingLaneAction {
  href: string;
  label: string;
  icon: ReactNode;
  variant?: 'primary' | 'ghost';
}

export interface WorkingLaneCardProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent: string;
  actions: WorkingLaneAction[];
  tags?: string[];
}

export function WorkingLaneCard({
  eyebrow,
  title,
  description,
  icon,
  accent,
  actions,
  tags = [],
}: WorkingLaneCardProps) {
  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1);

  return (
    <Card className="flex h-full flex-col rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-5 sm:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background: `radial-gradient(circle at top right, ${accentToRgba(accent, 0.16)} 0%, rgba(255,255,255,0) 72%)`,
        }}
      />
      <div className="relative z-[1] flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
          style={{
            borderColor: accentToRgba(accent, 0.18),
            backgroundColor: accentToRgba(accent, 0.1),
            color: accent,
          }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: accent }}>
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-[1.45rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
        </div>
      </div>

      <p className="relative z-[1] mt-4 text-sm leading-6 text-[var(--text-secondary)] sm:leading-7">{description}</p>

      {tags.length ? (
        <div className="relative z-[1] mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em]"
              style={{
                borderColor: accentToRgba(accent, 0.16),
                backgroundColor: accentToRgba(accent, 0.06),
                color: 'var(--text-secondary)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative z-[1] mt-auto pt-5">
        {primaryAction ? (
          <Link href={primaryAction.href}>
            <Button
              variant={primaryAction.variant === 'ghost' ? 'ghost' : undefined}
              className={
                primaryAction.variant === 'ghost'
                  ? 'w-full justify-between rounded-2xl border border-[var(--line)]'
                  : 'w-full justify-between rounded-2xl'
              }
            >
              {primaryAction.label}
              {primaryAction.icon}
            </Button>
          </Link>
        ) : null}

        {secondaryActions.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {secondaryActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-between rounded-2xl border border-[var(--line)]"
                >
                  {action.label}
                  {action.icon}
                </Button>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
