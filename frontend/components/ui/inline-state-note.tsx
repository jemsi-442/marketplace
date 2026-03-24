import { CheckCircle2, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

interface InlineStateNoteProps {
  message: string;
  tone?: 'success' | 'info';
}

const toneClasses: Record<NonNullable<InlineStateNoteProps['tone']>, string> = {
  success: 'border-[rgba(83,214,146,0.22)] bg-[rgba(83,214,146,0.08)] text-[#d9ffe8]',
  info: 'border-[rgba(78,137,255,0.22)] bg-[rgba(47,107,255,0.08)] text-[var(--text-primary)]',
};

export function InlineStateNote({ message, tone = 'info' }: InlineStateNoteProps) {
  const Icon = tone === 'success' ? CheckCircle2 : Info;

  return (
    <div className={cn('flex items-start gap-3 rounded-[18px] border px-4 py-3 text-sm leading-6', toneClasses[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
