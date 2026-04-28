import type { ReactNode } from 'react';

import { accentToRgba } from '@/components/dashboard/chart-utils';
import { Card } from '@/components/ui/card';

interface RuntimePostureCardProps {
  label: string;
  value: string;
  detail: string;
  accent: string;
  icon: ReactNode;
  chips?: string[];
}

export function RuntimePostureCard({
  label,
  value,
  detail,
  accent,
  icon,
  chips = [],
}: RuntimePostureCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{
          background: `radial-gradient(circle at top right, ${accentToRgba(accent, 0.16)} 0%, rgba(255,255,255,0) 74%)`,
        }}
      />
      <div className="relative z-[1] flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</p>
          <h4 className="mt-3 font-display text-[1.45rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{value}</h4>
        </div>
        <div
          className="rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          style={{
            borderColor: accentToRgba(accent, 0.18),
            backgroundColor: accentToRgba(accent, 0.1),
            color: accent,
          }}
        >
          {icon}
        </div>
      </div>
      <div className="relative z-[1] mt-3 h-[3px] w-20 rounded-full bg-[rgba(255,255,255,0.7)]">
        <div
          className="h-[3px] rounded-full"
          style={{
            width: '100%',
            background: `linear-gradient(90deg, ${accentToRgba(accent, 0.5)} 0%, ${accent} 100%)`,
          }}
        />
      </div>
      <p className="relative z-[1] mt-3 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
      {chips.length ? (
        <div className="relative z-[1] mt-4 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-[var(--line)] bg-white/72 px-3 py-2">
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
