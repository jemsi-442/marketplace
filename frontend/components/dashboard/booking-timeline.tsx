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

function formatMoney(amount?: number | null, currency = 'TZS'): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '--';
  }

  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
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
      detail: `${booking.escrow.reference} for ${formatMoney(booking.escrow.amount_minor, booking.escrow.currency)}.`,
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
  const summaryItems = [
    {
      label: 'Opened',
      value: booking.created_at,
      tone: 'border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] text-[var(--brand-primary)]',
    },
    {
      label: 'Escrow',
      value: booking.escrow ? booking.escrow.status : 'Missing',
      tone: booking.escrow
        ? 'border-[rgba(20,184,166,0.16)] bg-[rgba(20,184,166,0.08)] text-[rgb(15,118,110)]'
        : 'border-[rgba(245,158,11,0.16)] bg-[rgba(245,158,11,0.08)] text-[rgb(146,64,14)]',
    },
    {
      label: 'Next',
      value: steps.find((step) => step.state === 'current' || step.state === 'risk' || step.state === 'pending')?.title ?? 'Closed',
      tone: 'border-[rgba(56,189,248,0.16)] bg-[rgba(56,189,248,0.08)] text-[rgb(12,74,110)]',
    },
  ];

  return (
    <div className="rounded-[22px] border border-[rgba(56,189,248,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg text-[var(--text-primary)]">{booking.service_title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking #{booking.id}</span>
            <StatusBadge label={booking.status} tone={getBookingStatusTone(booking.status)} />
            {booking.escrow ? <StatusBadge label={booking.escrow.status} tone={getEscrowStatusTone(booking.escrow.status)} /> : null}
          </div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--brand-secondary)]">
          <WalletCards className="size-4" />
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {summaryItems.map((item) => (
          <div key={item.label} className="rounded-[18px] border border-[var(--line)] bg-white px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
            <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] ${item.tone}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border',
                  step.state === 'done' && 'border-[rgba(34,197,94,0.18)] bg-[rgba(240,253,244,0.94)] text-emerald-700',
                  step.state === 'current' && 'border-[rgba(79,70,229,0.18)] bg-[rgba(238,242,255,0.94)] text-[var(--brand-primary)]',
                  step.state === 'pending' && 'border-[var(--line)] bg-white text-[var(--text-tertiary)]',
                  step.state === 'risk' && 'border-[rgba(249,115,22,0.18)] bg-[rgba(255,247,237,0.94)] text-orange-700',
                )}
              >
                <StepIcon state={step.state} />
              </div>
              {index < steps.length - 1 ? (
                <div className="mt-2 h-8 w-px bg-[rgba(148,163,184,0.24)]" />
              ) : null}
            </div>
            <div className="pb-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
