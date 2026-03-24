import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'finance' | 'communication' | 'risk' | 'guidance' | 'activity' | 'market';

const cardVariantStyles: Record<CardVariant, string> = {
  default: 'bg-[linear-gradient(180deg,rgba(11,24,58,0.88),rgba(18,39,94,0.72))]',
  finance: 'bg-[linear-gradient(180deg,rgba(20,26,84,0.9),rgba(32,47,132,0.76))]',
  communication: 'bg-[linear-gradient(180deg,rgba(8,42,86,0.9),rgba(15,63,120,0.76))]',
  risk: 'bg-[linear-gradient(180deg,rgba(58,18,48,0.88),rgba(108,36,74,0.74))]',
  guidance: 'bg-[linear-gradient(180deg,rgba(16,29,72,0.9),rgba(26,40,93,0.76))]',
  activity: 'bg-[linear-gradient(180deg,rgba(10,34,90,0.9),rgba(20,67,141,0.76))]',
  market: 'bg-[linear-gradient(180deg,rgba(14,33,70,0.9),rgba(24,52,108,0.76))]',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[28px] border border-[var(--line)] p-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_38px_90px_rgba(0,0,0,0.38)] animate-fade-up before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-18 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)] before:opacity-70',
        cardVariantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
