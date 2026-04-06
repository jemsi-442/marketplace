import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-semibold transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px]',
  {
    variants: {
      variant: {
        primary: 'relative overflow-hidden border border-[rgba(79,70,229,0.18)] bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-5 py-3 text-[var(--ink-strong)] shadow-[0_12px_28px_rgba(79,70,229,0.22)] hover:-translate-y-[1px] hover:brightness-[1.03] hover:shadow-[0_16px_34px_rgba(79,70,229,0.28)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_48%)] before:opacity-70',
        ghost: 'border border-[var(--line)] bg-[rgba(255,255,255,0.9)] px-5 py-3 text-[var(--text-primary)] hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]',
        quiet: 'px-3 py-2 text-[var(--text-secondary)] hover:-translate-y-[1px] hover:text-[var(--brand-primary)]',
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
