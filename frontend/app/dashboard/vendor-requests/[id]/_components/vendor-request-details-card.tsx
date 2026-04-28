'use client';

import { Card } from '@/components/ui/card';
import type { VendorRequestFeedRecord } from '@/lib/types';

import { formatVendorRequestDetailMoney } from '../vendor-request-detail.utils';

interface VendorRequestDetailsCardProps {
  request: VendorRequestFeedRecord;
}

export function VendorRequestDetailsCard({
  request,
}: VendorRequestDetailsCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Request details
      </p>
      <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
        <p>
          <span className="font-medium text-[var(--text-primary)]">Scope:</span>{' '}
          {request.scope_details || 'No extra detail yet.'}
        </p>
        <p>
          <span className="font-medium text-[var(--text-primary)]">
            Client timing:
          </span>{' '}
          {request.deadline_note || 'No timing note yet.'}
        </p>
        <p>
          <span className="font-medium text-[var(--text-primary)]">
            Client budget:
          </span>{' '}
          {request.budget_note || 'No budget note yet.'}
        </p>
        <p>
          <span className="font-medium text-[var(--text-primary)]">
            Your current lane:
          </span>{' '}
          {request.capability.experience_level || 'Experience not stated'} •{' '}
          {formatVendorRequestDetailMoney(
            request.capability.starting_price_minor,
          )}{' '}
          • {request.capability.turnaround_note || 'No turnaround yet'}
        </p>
      </div>
    </Card>
  );
}
