'use client';

import { ArrowRight, Boxes, Workflow } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ServiceGroupRecord } from '@/lib/types';

import { requestServiceIconMap } from '../request-services.utils';

interface RequestServiceGroupCardProps {
  group: ServiceGroupRecord;
}

export function RequestServiceGroupCard({
  group,
}: RequestServiceGroupCardProps) {
  const Icon = requestServiceIconMap[group.slug] ?? Boxes;

  return (
    <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(59,130,246,0.10)] text-[var(--brand-primary)]">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
              {group.eyebrow}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {group.title}
            </h3>
          </div>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          {group.service_count} services
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {group.description}
      </p>

      <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Good for
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          {group.hero_description}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {group.featured_services.slice(0, 4).map((name) => (
          <span
            key={name}
            className="rounded-full border border-[var(--line)] bg-[rgba(248,250,252,0.92)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]"
          >
            {name}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        <Workflow className="size-3.5" />
        Focused search and one managed path
      </div>

      <div className="mt-auto pt-5">
        <Link href={`/dashboard/request-services/category/${group.slug}`}>
          <Button className="rounded-full">
            Open lane
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
