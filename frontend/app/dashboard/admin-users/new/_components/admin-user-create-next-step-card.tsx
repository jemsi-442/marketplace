'use client';

import { Card } from '@/components/ui/card';

export function AdminUserCreateNextStepCard() {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Next step
      </p>
      <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
        <p>Create the account here first.</p>
        <p>
          Open the user page only when you need more edits, lock changes, or
          deletion.
        </p>
        <p>Vendor accounts are prepared for the vendor lane automatically.</p>
      </div>
    </Card>
  );
}
