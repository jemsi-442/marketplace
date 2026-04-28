'use client';

import { Card } from '@/components/ui/card';

import { requestServiceCommercialRhythmItems } from '../request-service-detail.utils';

export function RequestServiceCommercialRhythmCard() {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            Commercial rhythm
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            What happens after you submit
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          This stays consistent across WOLFIX lanes
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {requestServiceCommercialRhythmItems.map((item) => (
          <div
            key={item.title}
            className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {item.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
