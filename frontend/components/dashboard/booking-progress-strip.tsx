import type { BookingRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getBookingProgressSteps } from '@/lib/status';

interface BookingProgressStripProps {
  booking: Pick<BookingRecord, 'status' | 'escrow'>;
}

export function BookingProgressStrip({ booking }: BookingProgressStripProps) {
  const steps = getBookingProgressSteps(booking);

  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[rgba(248,250,252,0.94)] px-4 py-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        {steps.map((step, index) => (
          <div key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold uppercase tracking-[0.14em]',
                step.state === 'done' && 'border-[rgba(34,197,94,0.18)] bg-[rgba(240,253,244,0.94)] text-emerald-700',
                step.state === 'current' && 'border-[rgba(99,102,241,0.18)] bg-[rgba(238,242,255,0.94)] text-[var(--brand-primary)]',
                step.state === 'pending' && 'border-[var(--line)] bg-white text-[var(--text-tertiary)]',
                step.state === 'risk' && 'border-[rgba(249,115,22,0.18)] bg-[rgba(255,247,237,0.94)] text-orange-700',
              )}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                'truncate text-[11px] uppercase tracking-[0.16em]',
                step.state === 'done' && 'text-emerald-700',
                step.state === 'current' && 'text-[var(--text-primary)]',
                step.state === 'pending' && 'text-[var(--text-tertiary)]',
                step.state === 'risk' && 'text-orange-700',
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? <div className="h-px flex-1 bg-[var(--line)]" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
