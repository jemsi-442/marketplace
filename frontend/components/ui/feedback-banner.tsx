import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeedbackBannerProps {
  message: string;
  onDismiss?: () => void;
  tone?: 'success' | 'info' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<FeedbackBannerProps['tone']>, string> = {
  success: 'border-[rgba(34,197,94,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.96))] text-[var(--text-primary)]',
  info: 'border-[rgba(99,102,241,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.96))] text-[var(--text-primary)]',
  warning: 'border-[rgba(245,158,11,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.96))] text-[var(--text-primary)]',
  danger: 'border-[rgba(251,113,133,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.96))] text-[var(--text-primary)]',
};

const toneIconClasses: Record<NonNullable<FeedbackBannerProps['tone']>, string> = {
  success: 'text-emerald-600 bg-[rgba(34,197,94,0.1)]',
  info: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]',
  warning: 'text-[var(--accent-amber)] bg-[rgba(245,158,11,0.12)]',
  danger: 'text-rose-600 bg-[rgba(251,113,133,0.12)]',
};

export function FeedbackBanner({ message, onDismiss, tone = 'success' }: FeedbackBannerProps) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' || tone === 'danger' ? AlertTriangle : Info;

  return (
    <div className={cn('flex items-start justify-between gap-4 rounded-[24px] border px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]', toneClasses[tone])}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex size-9 items-center justify-center rounded-2xl', toneIconClasses[tone])}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {tone === 'success' ? 'Success' : tone === 'warning' ? 'Warning' : tone === 'danger' ? 'Attention' : 'Update'}
          </p>
          <p className="mt-1 text-sm leading-7 text-[var(--text-primary)]">{message}</p>
        </div>
      </div>
      {onDismiss ? (
        <Button variant="quiet" size="sm" onClick={onDismiss} aria-label="Dismiss feedback">
          <XCircle className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
