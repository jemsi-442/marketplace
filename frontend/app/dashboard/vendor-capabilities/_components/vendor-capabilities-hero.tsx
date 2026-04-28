'use client';

import { Boxes, Search } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

interface VendorCapabilitiesHeroProps {
  businessLaneCount: number;
  deepestLaneLabel: string;
  reviewPressure: number;
  search: string;
  totalActiveCapabilities: number;
  onSearchChange: (value: string) => void;
}

export function VendorCapabilitiesHero({
  businessLaneCount,
  deepestLaneLabel,
  reviewPressure,
  search,
  totalActiveCapabilities,
  onSearchChange,
}: VendorCapabilitiesHeroProps) {
  const summaryCards = [
    { label: 'Business lanes', value: String(businessLaneCount) },
    { label: 'Active lanes', value: String(totalActiveCapabilities) },
    { label: 'Deepest lane', value: deepestLaneLabel },
  ];

  return (
    <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f7fbf9_55%,#edfdf5_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,185,129,0.18)] bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-teal)]">
            <Boxes className="size-3.5" />
            Vendor capability lanes
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
            Organize vendor capabilities by business lane before they enter the
            request queue.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            This keeps software, design, finance support, content production,
            research documentation, government consultancy, social media,
            cybersecurity, and operations work in separate lanes so your vendor
            studio stays clear and your review path stays focused.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {summaryCards.map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/82 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {item.label}
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Search lanes
          </p>
          <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3">
            <Search className="size-4 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search software, finance, content, research..."
              className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Once you open a lane, that page gets its own focused search and
            capability editor.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge
              label={`${reviewPressure} need review`}
              tone={reviewPressure > 0 ? 'warning' : 'neutral'}
            />
            <StatusBadge
              label={`${totalActiveCapabilities} live now`}
              tone="success"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
