import { CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeedbackBannerProps {
  message: string;
  onDismiss?: () => void;
  tone?: 'success' | 'info' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<FeedbackBannerProps['tone']>, string> = {
  success: 'border-[rgba(83,214,146,0.22)] bg-[rgba(83,214,146,0.08)]',
  info: 'border-[rgba(78,137,255,0.22)] bg-[rgba(47,107,255,0.08)]',
  warning: 'border-[rgba(255,196,82,0.22)] bg-[rgba(255,196,82,0.08)]',
  danger: 'border-[rgba(255,110,110,0.22)] bg-[rgba(255,110,110,0.08)]',
};

const toneIconClasses: Record<NonNullable<FeedbackBannerProps['tone']>, string> = {
  success: 'text-[#8ef0b7]',
  info: 'text-[var(--brand-secondary)]',
  warning: 'text-[#ffd47b]',
  danger: 'text-[#ffb3b3]',
};

export function FeedbackBanner({ message, onDismiss, tone = 'success' }: FeedbackBannerProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 rounded-[24px] border px-5 py-4', toneClasses[tone])}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', toneIconClasses[tone])}>
          <CheckCircle2 className="size-5" />
        </div>
        <p className="text-sm leading-7 text-[var(--text-primary)]">{message}</p>
      </div>
      {onDismiss ? (
        <Button variant="quiet" size="sm" onClick={onDismiss} aria-label="Dismiss feedback">
          <XCircle className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
