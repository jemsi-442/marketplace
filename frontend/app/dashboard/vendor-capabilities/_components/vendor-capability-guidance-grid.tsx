'use client';

import { Card } from '@/components/ui/card';

import { capabilityGuidanceItems } from '../vendor-capabilities.utils';

export function VendorCapabilityGuidanceGrid() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {capabilityGuidanceItems.map((item) => (
        <Card
          key={item.title}
          className="flex h-full flex-col rounded-[26px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.10)] text-[var(--accent-teal)]">
              {item.icon}
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-teal)]">
              {item.title}
            </p>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {item.detail}
          </p>
        </Card>
      ))}
    </div>
  );
}
