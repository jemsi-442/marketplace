import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  neutral: 'border-[var(--line)] bg-[rgba(248,250,252,0.94)] text-[var(--text-secondary)]',
  info: 'border-[rgba(99,102,241,0.16)] bg-[rgba(238,242,255,0.94)] text-[var(--brand-primary)]',
  success: 'border-[rgba(34,197,94,0.16)] bg-[rgba(240,253,244,0.94)] text-emerald-700',
  warning: 'border-[rgba(245,158,11,0.16)] bg-[rgba(255,251,235,0.94)] text-amber-700',
  danger: 'border-[rgba(249,115,22,0.16)] bg-[rgba(255,247,237,0.94)] text-orange-700',
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-2 text-xs uppercase tracking-[0.14em] transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:brightness-110',
        toneClasses[tone],
      )}
    >
      {label}
    </div>
  );
}
