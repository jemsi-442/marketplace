import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  neutral: 'border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-secondary)]',
  info: 'border-[rgba(78,137,255,0.22)] bg-[rgba(47,107,255,0.12)] text-[var(--brand-secondary)]',
  success: 'border-[rgba(83,214,146,0.22)] bg-[rgba(83,214,146,0.12)] text-[#8ef0b7]',
  warning: 'border-[rgba(255,196,82,0.22)] bg-[rgba(255,196,82,0.12)] text-[#ffd47b]',
  danger: 'border-[rgba(255,110,110,0.22)] bg-[rgba(255,110,110,0.12)] text-[#ffb3b3]',
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
