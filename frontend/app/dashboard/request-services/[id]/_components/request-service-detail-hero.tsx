'use client';

import { ArrowLeft, ArrowRight, Layers3 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type {
  RequestServiceInsights,
} from '@/lib/services/request-service-insights';
import type { ServiceTypeRecord } from '@/lib/types';

interface RequestServiceDetailHeroProps {
  backHref: string;
  continueHref: string;
  laneLabel: string;
  insights: RequestServiceInsights | null;
  serviceType: ServiceTypeRecord;
}

export function RequestServiceDetailHero({
  backHref,
  continueHref,
  laneLabel,
  insights,
  serviceType,
}: RequestServiceDetailHeroProps) {
  const laneFitItems = [
    { label: 'Admin-managed review', value: 'Active' },
    { label: 'Lane', value: laneLabel },
    { label: 'Category', value: serviceType.category ?? 'General' },
  ];

  return (
    <Card className="overflow-hidden rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#eef6ff_100%)] p-5 shadow-[0_20px_54px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.14)] bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
            <Layers3 className="size-3.5" />
            {laneLabel}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            {serviceType.category ?? 'Digital service'}
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
            {serviceType.name}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            {serviceType.description ||
              'Use this service when you want WOLFIX to coordinate the work and return one clear next step.'}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            {insights?.outcome}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={backHref} className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 size-4" />
                Back to lanes
              </Button>
            </Link>
            <Link href={continueHref} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                Continue to request
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Lane fit
            </p>
            <div className="mt-4 space-y-4">
              {laneFitItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="text-sm text-[var(--text-secondary)]">
                    {item.label}
                  </span>
                  <span className="text-right text-sm font-semibold text-[var(--text-primary)]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Next move
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Open the request page once this service matches your outcome.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
