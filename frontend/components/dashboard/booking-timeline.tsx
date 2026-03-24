import { CheckCircle2, CircleDashed, Clock3, ShieldAlert, WalletCards } from 'lucide-react';

import { StatusBadge } from '@/components/ui/status-badge';
import { getBookingStatusTone, getEscrowStatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { BookingRecord } from '@/lib/types';

interface BookingTimelineProps {
  booking: BookingRecord;
  perspective: 'client' | 'vendor';
}

interface TimelineStep {
  key: string;
  title: string;
  detail: string;
  state: 'done' | 'current' | 'pending' | 'risk';
}

function buildTimeline(booking: BookingRecord, perspective: 'client' | 'vendor'): TimelineStep[] {
  const steps: TimelineStep[] = [
    {
      key: 'booking-created',
      title: 'Booking created',
      detail: `Booking opened on ${booking.created_at}.`,
      state: 'done',
    },
  ];

  if (booking.escrow) {
    steps.push({
      key: 'escrow-created',
      title: 'Escrow issued',
      detail: `${booking.escrow.reference} for ${booking.escrow.amount_minor} ${booking.escrow.currency}.`,
      state: 'done',
    });

    switch (booking.escrow.status) {
      case 'CREATED':
        steps.push({
          key: 'collection-pending',
          title: 'Collection pending',
          detail: perspective === 'client'
            ? 'Client still needs to initiate payment collection.'
            : 'Waiting for the client to initiate payment collection.',
          state: 'current',
        });
        break;
      case 'FUNDED':
      case 'ACTIVE':
        steps.push({
          key: 'work-in-flight',
          title: 'Protected delivery window',
          detail: perspective === 'client'
            ? 'Funds are protected while vendor delivery is in progress.'
            : 'Funds are protected while you complete delivery.',
          state: 'current',
        });
        break;
      case 'RELEASED':
        steps.push({
          key: 'released',
          title: 'Escrow released',
          detail: perspective === 'client'
            ? 'Work was accepted and funds were released to the vendor.'
            : 'Funds were released after client confirmation.',
          state: 'done',
        });
        break;
      case 'DISPUTED':
        steps.push({
          key: 'disputed',
          title: 'Dispute review',
          detail: 'This booking is under admin review before final settlement.',
          state: 'risk',
        });
        break;
      case 'RESOLVED':
        steps.push({
          key: 'resolved',
          title: 'Dispute resolved',
          detail: 'Admin resolution closed the escrow workflow.',
          state: 'done',
        });
        break;
      default:
        break;
    }
  } else {
    steps.push({
      key: 'escrow-missing',
      title: 'Escrow not created yet',
      detail: perspective === 'client'
        ? 'Create escrow to move this booking into a protected payment flow.'
        : 'Waiting for the client to create escrow before funds can be protected.',
      state: 'current',
    });
  }

  if (booking.status === 'completed') {
    steps.push({
      key: 'booking-completed',
      title: 'Booking completed',
      detail: perspective === 'client'
        ? 'Delivery finished and the booking is ready for review.'
        : 'Delivery finished and the booking is closed.',
      state: 'done',
    });
  } else if (booking.status === 'cancelled') {
    steps.push({
      key: 'booking-cancelled',
      title: 'Booking cancelled',
      detail: 'This workflow was closed before completion.',
      state: 'risk',
    });
  } else {
    steps.push({
      key: 'booking-open',
      title: 'Booking still open',
      detail: perspective === 'client'
        ? 'Use release, dispute, and messaging actions as work progresses.'
        : 'Coordinate with the client and keep delivery moving.',
      state: 'pending',
    });
  }

  return steps;
}

function StepIcon({ state }: Pick<TimelineStep, 'state'>) {
  if (state === 'done') {
    return <CheckCircle2 className="size-5" />;
  }

  if (state === 'risk') {
    return <ShieldAlert className="size-5" />;
  }

  if (state === 'current') {
    return <Clock3 className="size-5" />;
  }

  return <CircleDashed className="size-5" />;
}

export function BookingTimeline({ booking, perspective }: BookingTimelineProps) {
  const steps = buildTimeline(booking, perspective);

  return (
    <div className="rounded-[22px] border border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.6),rgba(18,64,134,0.38))] p-4 backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(0,0,0,0.26)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg text-[var(--text-primary)]">{booking.service_title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking #{booking.id}</span>
            <StatusBadge label={booking.status} tone={getBookingStatusTone(booking.status)} />
            {booking.escrow ? <StatusBadge label={booking.escrow.status} tone={getEscrowStatusTone(booking.escrow.status)} /> : null}
          </div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--panel-muted)] text-[var(--brand-secondary)]">
          <WalletCards className="size-4" />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border',
                  step.state === 'done' && 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300',
                  step.state === 'current' && 'border-[rgba(206,226,250,0.34)] bg-[rgba(255,255,255,0.14)] text-white',
                  step.state === 'pending' && 'border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-tertiary)]',
                  step.state === 'risk' && 'border-rose-400/50 bg-rose-400/10 text-rose-300',
                )}
              >
                <StepIcon state={step.state} />
              </div>
              {index < steps.length - 1 ? (
                <div className="mt-2 h-8 w-px bg-[var(--line)]" />
              ) : null}
            </div>
            <div className="pb-2">
              <p className="text-sm text-[var(--text-primary)]">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
