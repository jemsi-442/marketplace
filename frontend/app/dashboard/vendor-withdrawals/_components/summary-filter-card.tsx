'use client';

import { Card } from '@/components/ui/card';

interface SummaryFilterCardProps {
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
}

export function SummaryFilterCard({
  label,
  value,
  active,
  onClick,
}: SummaryFilterCardProps) {
  const content = (
    <Card
      className={`rounded-[24px] border p-5 transition ${
        active
          ? 'border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.06)] shadow-[0_10px_24px_rgba(59,130,246,0.08)]'
          : 'border-[rgba(15,23,42,0.08)]'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
        {value}
      </p>
    </Card>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button type="button" onClick={onClick} className="text-left">
      {content}
    </button>
  );
}
