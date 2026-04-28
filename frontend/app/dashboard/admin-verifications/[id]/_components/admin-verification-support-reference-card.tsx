'use client';

import { Card } from '@/components/ui/card';

interface AdminVerificationSupportReferenceCardProps {
  requestId: string;
}

export function AdminVerificationSupportReferenceCard({
  requestId,
}: AdminVerificationSupportReferenceCardProps) {
  return (
    <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        Support reference
      </p>
      <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
        {requestId}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Use this request ID to trace the failed review action in backend logs.
      </p>
    </Card>
  );
}
