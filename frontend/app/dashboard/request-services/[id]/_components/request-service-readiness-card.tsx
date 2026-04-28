'use client';

import { SearchCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { RequestServiceInsights } from '@/lib/services/request-service-insights';
import type { ServiceTypeRecord } from '@/lib/types';

interface RequestServiceReadinessCardProps {
  insights: RequestServiceInsights | null;
  serviceType: ServiceTypeRecord;
}

export function RequestServiceReadinessCard({
  insights,
  serviceType,
}: RequestServiceReadinessCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(14,165,233,0.12)] text-[var(--accent-cyan)]">
          <SearchCheck className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            Before you continue
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            Bring the details that help review start cleanly
          </h2>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {insights?.readiness.map((item) => (
          <div
            key={item.title}
            className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {item.detail}
            </p>
          </div>
        ))}
        {serviceType.default_brief_template ? (
          <div className="rounded-[22px] border border-[rgba(59,130,246,0.14)] bg-[rgba(59,130,246,0.06)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
              Request prompt
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {serviceType.default_brief_template}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
