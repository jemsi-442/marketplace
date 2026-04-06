import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'finance' | 'communication' | 'risk' | 'guidance' | 'activity' | 'market';

const cardVariantStyles: Record<CardVariant, string> = {
  default: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))]',
  finance: 'bg-[linear-gradient(180deg,rgba(240,253,250,0.98),rgba(236,253,245,0.98))]',
  communication: 'bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(238,242,255,0.98))]',
  risk: 'bg-[linear-gradient(180deg,rgba(255,247,237,0.98),rgba(255,241,242,0.98))]',
  guidance: 'bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))]',
  activity: 'bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(239,246,255,0.98))]',
  market: 'bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,249,195,0.74))]',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[22px] border border-[var(--line)] p-4 shadow-[var(--shadow-soft)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(15,23,42,0.14)] animate-fade-up before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-16 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.7),transparent)] before:opacity-80 sm:rounded-[24px] sm:p-6',
        cardVariantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
