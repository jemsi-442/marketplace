'use client';

import { ArrowRight, Boxes } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { ServiceGroupRecord } from '@/lib/types';

import {
  capabilityIconMap,
  defaultGroupMetrics,
  type GroupMetrics,
} from '../vendor-capabilities.utils';

interface VendorCapabilityGroupCardProps {
  group: ServiceGroupRecord;
  metrics?: GroupMetrics;
}

export function VendorCapabilityGroupCard({
  group,
  metrics = defaultGroupMetrics(),
}: VendorCapabilityGroupCardProps) {
  const Icon = capabilityIconMap[group.slug] ?? Boxes;
  const metricCards = [
    { label: 'Configured', value: String(metrics.configured) },
    { label: 'Pending', value: String(metrics.pending) },
    { label: 'Returned', value: String(metrics.returned) },
  ];

  return (
    <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-teal)]">
            {group.eyebrow}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            {group.title}
          </h3>
        </div>
        <span className="flex size-12 items-center justify-center rounded-[20px] bg-[rgba(16,185,129,0.10)] text-[var(--accent-teal)]">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {group.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <StatusBadge label={`${group.service_count} services`} tone="info" />
        <StatusBadge
          label={`${metrics.active} active`}
          tone={metrics.active > 0 ? 'success' : 'neutral'}
        />
        <StatusBadge
          label={`${metrics.approved} approved`}
          tone={metrics.approved > 0 ? 'success' : 'neutral'}
        />
        <StatusBadge
          label={`${metrics.pending + metrics.returned} review items`}
          tone={metrics.pending + metrics.returned > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {metricCards.map((item) => (
          <div
            key={item.label}
            className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.8)] px-4 py-4"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {item.label}
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.88)] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Lane examples
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {group.featured_services.slice(0, 4).map((item) => (
            <span
              key={item}
              className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
        <Link href={`/dashboard/vendor-capabilities/category/${group.slug}`}>
          <Button className="justify-between rounded-2xl bg-[var(--accent-teal)] px-5 text-white hover:bg-[var(--accent-teal-strong)]">
            Configure lane
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
        <Link href="/dashboard/vendor-verification">
          <Button
            variant="ghost"
            className="rounded-2xl border border-[var(--line)] px-5"
          >
            Continue to verification
          </Button>
        </Link>
      </div>
    </Card>
  );
}
