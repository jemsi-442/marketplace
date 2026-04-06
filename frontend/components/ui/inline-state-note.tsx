import { CheckCircle2, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

interface InlineStateNoteProps {
  message: string;
  tone?: 'success' | 'info';
}

const toneClasses: Record<NonNullable<InlineStateNoteProps['tone']>, string> = {
  success: 'border-[rgba(34,197,94,0.16)] bg-[rgba(240,253,244,0.96)] text-[var(--text-primary)]',
  info: 'border-[rgba(99,102,241,0.14)] bg-[rgba(238,242,255,0.94)] text-[var(--text-primary)]',
};

export function InlineStateNote({ message, tone = 'info' }: InlineStateNoteProps) {
  const Icon = tone === 'success' ? CheckCircle2 : Info;

  return (
    <div className={cn('flex items-start gap-3 rounded-[18px] border px-4 py-3 text-sm leading-5 shadow-[0_8px_18px_rgba(15,23,42,0.04)]', toneClasses[tone])}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'success' ? 'text-emerald-600' : 'text-[var(--brand-primary)]')} />
      <p>{message}</p>
    </div>
  );
}
