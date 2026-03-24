import type { BookingRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getBookingProgressSteps } from '@/lib/status';

interface BookingProgressStripProps {
  booking: Pick<BookingRecord, 'status' | 'escrow'>;
}

export function BookingProgressStrip({ booking }: BookingProgressStripProps) {
  const steps = getBookingProgressSteps(booking);

  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        {steps.map((step, index) => (
          <div key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold uppercase tracking-[0.12em]',
                step.state === 'done' && 'border-[rgba(83,214,146,0.28)] bg-[rgba(83,214,146,0.12)] text-[#8ef0b7]',
                step.state === 'current' && 'border-[rgba(78,137,255,0.24)] bg-[rgba(47,107,255,0.12)] text-[var(--brand-secondary)]',
                step.state === 'pending' && 'border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-tertiary)]',
                step.state === 'risk' && 'border-[rgba(255,110,110,0.24)] bg-[rgba(255,110,110,0.12)] text-[#ffb3b3]',
              )}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                'truncate text-xs uppercase tracking-[0.14em]',
                step.state === 'done' && 'text-[#baf7d0]',
                step.state === 'current' && 'text-[var(--text-primary)]',
                step.state === 'pending' && 'text-[var(--text-tertiary)]',
                step.state === 'risk' && 'text-[#ffc2c2]',
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
