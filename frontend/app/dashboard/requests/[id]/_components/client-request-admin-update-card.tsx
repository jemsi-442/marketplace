'use client';

import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ClientRequestRecord } from '@/lib/types';

import { formatClientRequestMoney } from '../request-detail.utils';

interface ClientRequestAdminUpdateCardProps {
  canOpenBooking: boolean;
  isOpeningBooking: boolean;
  nextStep: string;
  openBookingLabel: string;
  request: ClientRequestRecord;
  onOpenBooking: () => void;
}

export function ClientRequestAdminUpdateCard({
  canOpenBooking,
  isOpeningBooking,
  nextStep,
  openBookingLabel,
  request,
  onOpenBooking,
}: ClientRequestAdminUpdateCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Admin update
      </p>
      <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
        <p>
          <span className="font-medium text-[var(--text-primary)]">Next step:</span>{' '}
          {nextStep}
        </p>
        <p>
          <span className="font-medium text-[var(--text-primary)]">Price:</span>{' '}
          {formatClientRequestMoney(
            request.agreed_price_minor,
            request.currency ?? 'TZS',
          )}
        </p>
        <p>
          <span className="font-medium text-[var(--text-primary)]">Timeline:</span>{' '}
          {request.agreed_timeline_note || 'Waiting for admin timing update.'}
        </p>
        <p>
          <span className="font-medium text-[var(--text-primary)]">Platform note:</span>{' '}
          {request.admin_assignment_note ||
            'WOLFIX is still managing this request.'}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {canOpenBooking ? (
          <Button
            className="w-full sm:w-auto"
            onClick={onOpenBooking}
            disabled={isOpeningBooking}
          >
            {isOpeningBooking ? 'Opening booking...' : openBookingLabel}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
