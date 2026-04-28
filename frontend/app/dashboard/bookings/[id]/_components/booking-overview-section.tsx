import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { getBookingStatusTone, getEscrowStatusTone } from '@/lib/status';
import type { BookingRecord } from '@/lib/types';

interface BookingOverviewSectionProps {
  booking: BookingRecord;
  nextStep: string;
}

export function BookingOverviewSection({ booking, nextStep }: BookingOverviewSectionProps) {
  return (
    <>
      <Card className="space-y-4 rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking summary</p>
          <h1 className="font-display text-2xl text-[var(--text-primary)] sm:text-3xl">{booking.service_title}</h1>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">{booking.request_summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={booking.status} tone={getBookingStatusTone(booking.status)} />
          {booking.escrow ? <StatusBadge label={booking.escrow.status} tone={getEscrowStatusTone(booking.escrow.status)} /> : null}
          {typeof booking.unread_thread_count === 'number' && booking.unread_thread_count > 0 ? <StatusBadge label={`${booking.unread_thread_count} unread`} tone="warning" /> : null}
        </div>
      </Card>

      <Card className="space-y-4 p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Request details</p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Original request</h2>
        </div>
        <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Scope</span>
            <span className="mt-2 block">{booking.scope_details?.trim() ? booking.scope_details : 'No extra scope note was attached to this booking.'}</span>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Timing</span>
            <span className="mt-2 block">{booking.deadline_note?.trim() ? booking.deadline_note : 'No timing note was attached to this booking.'}</span>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Next step</span>
            <span className="mt-2 block">{nextStep}</span>
          </div>
        </div>
      </Card>
    </>
  );
}
