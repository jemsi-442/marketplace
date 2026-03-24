import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-semibold transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px]',
  {
    variants: {
      variant: {
        primary: 'relative overflow-hidden bg-[linear-gradient(135deg,#4e89ff_0%,#2f6bff_42%,#16359a_100%)] px-5 py-3 text-[var(--ink-strong)] shadow-[0_16px_36px_rgba(12,34,104,0.34)] hover:translate-y-[-1px] hover:brightness-105 hover:shadow-[0_20px_40px_rgba(12,34,104,0.42)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_48%)] before:opacity-80',
        ghost: 'border border-[var(--line)] bg-[linear-gradient(180deg,rgba(14,31,74,0.8),rgba(20,44,102,0.58))] px-5 py-3 text-[var(--text-primary)] hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(18,40,92,0.9),rgba(26,54,122,0.72))] hover:shadow-[0_14px_32px_rgba(0,0,0,0.18)]',
        quiet: 'px-3 py-2 text-[var(--text-secondary)] hover:-translate-y-[1px] hover:text-[var(--text-primary)]',
      },
      size: {
        default: 'h-11',
        sm: 'h-9 px-4 py-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
