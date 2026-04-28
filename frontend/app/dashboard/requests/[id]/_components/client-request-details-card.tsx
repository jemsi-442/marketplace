'use client';

import { Card } from '@/components/ui/card';
import type { ClientRequestRecord } from '@/lib/types';

interface ClientRequestDetailsCardProps {
  request: ClientRequestRecord;
}

export function ClientRequestDetailsCard({
  request,
}: ClientRequestDetailsCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Your request
      </p>
      <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
        <p>
          <span className="font-medium text-[var(--text-primary)]">Scope:</span>{' '}
          {request.scope_details || 'No extra scope note yet.'}
        </p>
        <p>
          <span className="font-medium text-[var(--text-primary)]">Timing:</span>{' '}
          {request.deadline_note || 'No timing note yet.'}
        </p>
        <p>
          <span className="font-medium text-[var(--text-primary)]">Budget:</span>{' '}
          {request.budget_note || 'No budget note yet.'}
        </p>
      </div>
    </Card>
  );
}
