'use client';

import { ArrowRight, BriefcaseBusiness, Compass, LifeBuoy, ShieldAlert } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WorkspaceStructureMapItem {
  label: string;
  title: string;
  detail: string;
  tone?: 'default' | 'guidance' | 'activity' | 'finance' | 'risk' | 'market' | 'communication';
}

interface WorkspaceStructureMapProps {
  eyebrow?: string;
  title: string;
  description: string;
  items: WorkspaceStructureMapItem[];
  className?: string;
}

const toneClasses: Record<NonNullable<WorkspaceStructureMapItem['tone']>, string> = {
  default: 'border-[rgba(148,163,184,0.18)] bg-[rgba(255,255,255,0.72)]',
  guidance: 'border-[rgba(148,163,184,0.2)] bg-[rgba(248,250,252,0.94)]',
  activity: 'border-[rgba(56,189,248,0.16)] bg-[rgba(240,249,255,0.94)]',
  finance: 'border-[rgba(20,184,166,0.16)] bg-[rgba(240,253,250,0.94)]',
  risk: 'border-[rgba(249,115,22,0.16)] bg-[rgba(255,247,237,0.94)]',
  market: 'border-[rgba(245,158,11,0.16)] bg-[rgba(255,251,235,0.94)]',
  communication: 'border-[rgba(139,92,246,0.16)] bg-[rgba(245,243,255,0.94)]',
};

const toneIcons: Record<NonNullable<WorkspaceStructureMapItem['tone']>, typeof Compass> = {
  default: Compass,
  guidance: Compass,
  activity: BriefcaseBusiness,
  finance: BriefcaseBusiness,
  risk: ShieldAlert,
  market: Compass,
  communication: LifeBuoy,
};

export function WorkspaceStructureMap({
  eyebrow = 'Page structure',
  title,
  description,
  items,
  className,
}: WorkspaceStructureMapProps) {
  return (
    <Card variant="guidance" className={cn('mt-6', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">{eyebrow}</p>
          <h2 className="mt-2 font-display text-[1.75rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-tertiary)] shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
          Read top to bottom
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-4 md:grid-cols-2">
        {items.map((item, index) => {
          const Icon = toneIcons[item.tone ?? 'default'];

          return (
            <div
              key={`${item.label}-${item.title}`}
              className={cn(
                'rounded-[20px] border p-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]',
                toneClasses[item.tone ?? 'default'],
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-[var(--brand-primary)]">
                  <Icon className="size-4" />
                </span>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {index + 1}
                  <ArrowRight className="size-3" />
                </span>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{item.label}</p>
              <p className="mt-2 font-display text-lg leading-6 text-[var(--text-primary)]">{item.title}</p>
              <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
