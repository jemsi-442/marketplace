'use client';

import { Card } from '@/components/ui/card';

import type { ProposalView } from '../vendor-requests.utils';

interface VendorRequestSummaryTilesProps {
  proposalView: ProposalView;
  summary: {
    total: number;
    needs_proposal: number;
    sent: number;
  };
  onApplyProposalView: (view: ProposalView) => void;
}

export function VendorRequestSummaryTiles({
  proposalView,
  summary,
  onApplyProposalView,
}: VendorRequestSummaryTilesProps) {
  const tiles = [
    { key: 'all' as const, label: 'All requests', value: summary.total },
    {
      key: 'needs_proposal' as const,
      label: 'Needs proposal',
      value: summary.needs_proposal,
    },
    { key: 'sent' as const, label: 'Proposal sent', value: summary.sent },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiles.map((tile) => (
        <button
          key={tile.key}
          type="button"
          onClick={() => onApplyProposalView(tile.key)}
          className={`text-left ${proposalView === tile.key ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {tile.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              {tile.value}
            </p>
          </Card>
        </button>
      ))}
    </div>
  );
}
