'use client';

import { ClipboardList } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminVendorInterestRecord } from '@/lib/types';

import { formatMoney, getInterestTone } from '../../admin-requests.utils';

interface AdminRequestProposalsCardProps {
  interests: AdminVendorInterestRecord[];
  selectedInterestId: number | null;
  onSelectInterest: (
    interestId: number,
    proposedPriceMinor?: number | null,
    timelineNote?: string | null,
  ) => void;
}

export function AdminRequestProposalsCard({
  interests,
  selectedInterestId,
  onSelectInterest,
}: AdminRequestProposalsCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Proposals
      </p>
      {!interests.length ? (
        <div className="mt-4">
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title="No proposals yet"
            description="Wait for vendors to respond first."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {interests.map((interest) => {
            const isSelected = selectedInterestId === interest.id;

            return (
              <button
                key={interest.id}
                type="button"
                onClick={() =>
                  onSelectInterest(
                    interest.id,
                    interest.proposed_price_minor,
                    interest.timeline_note,
                  )
                }
                className={
                  isSelected
                    ? 'w-full rounded-2xl border border-[var(--brand-primary)] bg-[rgba(59,130,246,0.06)] p-4 text-left'
                    : 'w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-left'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {interest.vendor.company_name || interest.vendor.email}
                  </p>
                  <StatusBadge
                    label={interest.status}
                    tone={getInterestTone(interest.status)}
                  />
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {formatMoney(interest.proposed_price_minor)} •{' '}
                  {interest.timeline_note || 'No timeline note'}
                </p>
                {interest.price_reason ? (
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {interest.price_reason}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
