'use client';

import { Layers3, ShieldCheck, Sparkles } from 'lucide-react';

import { Card } from '@/components/ui/card';

interface AdminCapabilitiesHeroProps {
  visibleLaneCount: number;
  pendingCount: number;
  returnedCount: number;
}

const reviewRhythmItems = [
  {
    title: 'Start with pressure',
    detail:
      'Use pending and returned states to find what needs guidance first.',
    icon: <Layers3 className="size-4" />,
  },
  {
    title: 'Read one lane together',
    detail:
      'Compare capabilities inside the same lane before deciding on proof and price.',
    icon: <Sparkles className="size-4" />,
  },
];

export function AdminCapabilitiesHero({
  visibleLaneCount,
  pendingCount,
  returnedCount,
}: AdminCapabilitiesHeroProps) {
  const summaryCards = [
    { label: 'Visible lanes', value: String(visibleLaneCount) },
    { label: 'Pending pressure', value: String(pendingCount) },
    { label: 'Returned lanes', value: String(returnedCount) },
  ];

  return (
    <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8faff_55%,#eef3ff_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.16)] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
            <ShieldCheck className="size-3.5" />
            Capability review
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
            Review capability lanes by business lane.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            Check price, proof, and delivery clarity before a lane goes live.
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
            Review rhythm
          </p>
          <div className="mt-4 space-y-3">
            {reviewRhythmItems.map((item) => (
              <div
                key={item.title}
                className="h-full rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-2xl bg-[rgba(99,102,241,0.10)] text-[var(--brand-primary)]">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
