'use client';

import { Layers3, ShieldCheck, Sparkles } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { AdminLaneReviewGuidance } from '@/lib/services/vendor-capability-review-insights';

interface AdminCapabilityGuidanceGridProps {
  laneGuidance: AdminLaneReviewGuidance;
}

export function AdminCapabilityGuidanceGrid({
  laneGuidance,
}: AdminCapabilityGuidanceGridProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {laneGuidance.cards.map((item, index) => (
        <Card
          key={item.title}
          className="h-full rounded-[26px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(99,102,241,0.10)] text-[var(--brand-primary)]">
              {index === 0 ? (
                <Layers3 className="size-4" />
              ) : index === 1 ? (
                <Sparkles className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
              {item.title}
            </p>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {item.detail}
          </p>
        </Card>
      ))}
    </div>
  );
}
