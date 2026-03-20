import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--brand-primary)] px-5 py-3 text-[var(--ink-strong)] shadow-[0_15px_40px_rgba(204,184,122,0.22)] hover:translate-y-[-1px] hover:bg-[var(--brand-primary-strong)]',
        ghost: 'border border-[var(--line)] bg-[var(--panel-muted)] px-5 py-3 text-[var(--text-primary)] hover:bg-[var(--panel-strong)]',
        quiet: 'px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
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
