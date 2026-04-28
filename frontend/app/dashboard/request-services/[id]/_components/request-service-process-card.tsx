'use client';

import { Workflow } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { RequestServiceInsights } from '@/lib/services/request-service-insights';

interface RequestServiceProcessCardProps {
  insights: RequestServiceInsights | null;
}

export function RequestServiceProcessCard({
  insights,
}: RequestServiceProcessCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(59,130,246,0.10)] text-[var(--brand-primary)]">
          <Workflow className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            How this lane works
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            Managed path from request to next step
          </h2>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {insights?.process.map((step, index) => (
          <div
            key={step.title}
            className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
              Step {index + 1}
            </p>
            <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {step.detail}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
