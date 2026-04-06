import type { BookingRecord } from '@/lib/types';

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatCompactMoney(valueMinor: number, currency = 'TZS'): string {
  return `${new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: valueMinor >= 100_000 ? 1 : 0,
  }).format(valueMinor / 100)} ${currency}`;
}

function toShortLabel(value: string, index: number): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }

  return `P${index + 1}`;
}

function getTrendPoints(bookings: BookingRecord[]) {
  return [...bookings]
    .sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();

      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return 0;
      }

      return leftTime - rightTime;
    })
    .slice(-6)
    .map((booking, index) => ({
      label: toShortLabel(booking.created_at, index),
      value: booking.escrow?.amount_minor ?? 0,
    }));
}

interface VendorStudioAnalyticsBoardProps {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  reviewCount: number;
  engagementCount: number;
  activeDeliveryCount: number;
  availableBalance: number;
  currency: string;
  trustScore?: number | null;
  releaseRatio?: number | null;
  bookings: BookingRecord[];
}

export function VendorStudioAnalyticsBoard({
  totalServices,
  activeServices,
  inactiveServices,
  reviewCount,
  engagementCount,
  activeDeliveryCount,
  availableBalance,
  currency,
  trustScore,
  releaseRatio,
  bookings,
}: VendorStudioAnalyticsBoardProps) {
  const reviewBackedLanes = Math.min(reviewCount, activeServices);
  const needsPolishLanes = Math.max(activeServices - reviewBackedLanes, 0);
  const totalForRing = Math.max(totalServices, 1);
  const ringRadius = 64;
  const circumference = 2 * Math.PI * ringRadius;
  const segments = [
    { value: reviewBackedLanes, color: 'var(--accent-teal)' },
    { value: needsPolishLanes, color: 'var(--accent-amber)' },
    { value: inactiveServices, color: 'var(--accent-coral)' },
  ];
  let currentOffset = 0;
  const ringSegments = segments.map((segment) => {
    const dash = (segment.value / totalForRing) * circumference;
    const result = {
      dash,
      offset: currentOffset,
      color: segment.color,
    };
    currentOffset -= dash;

    return result;
  });

  const laneCoverage = totalServices ? Math.round((activeServices / totalServices) * 100) : 0;
  const reviewCoverage = activeServices ? Math.round((reviewBackedLanes / activeServices) * 100) : 0;
  const deliveryPressure = engagementCount ? Math.round((activeDeliveryCount / engagementCount) * 100) : 0;
  const trendPoints = getTrendPoints(bookings);
  const safeTrendPoints = trendPoints.length
    ? trendPoints
    : [
        { label: 'P1', value: 0 },
        { label: 'P2', value: 0 },
        { label: 'P3', value: 0 },
        { label: 'P4', value: 0 },
      ];
  const peakValue = Math.max(...safeTrendPoints.map((point) => point.value), 0);
  const chartWidth = 520;
  const chartHeight = 168;
  const paddingX = 18;
  const paddingY = 18;
  const maxValue = Math.max(...safeTrendPoints.map((point) => point.value), 1);
  const stepX = (chartWidth - paddingX * 2) / Math.max(safeTrendPoints.length - 1, 1);
  const trendLine = safeTrendPoints
    .map((point, index) => {
      const x = paddingX + index * stepX;
      const y = chartHeight - paddingY - (point.value / maxValue) * (chartHeight - paddingY * 2);

      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  const trendArea = `${trendLine} L ${paddingX + stepX * (safeTrendPoints.length - 1)} ${chartHeight - paddingY} L ${paddingX} ${chartHeight - paddingY} Z`;
  const signalChips = [
    { label: 'Proof', value: reviewBackedLanes, color: 'var(--accent-teal)' },
    { label: 'Polish', value: needsPolishLanes, color: 'var(--accent-amber)' },
    { label: 'Inactive', value: inactiveServices, color: 'var(--accent-coral)' },
    { label: 'Delivery', value: activeDeliveryCount, color: 'var(--accent-cyan)' },
  ];

  return (
    <div className="rounded-[30px] border border-[var(--line)] bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Studio analytics</p>
          <h3 className="mt-2 font-display text-2xl tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">Read capability health and revenue posture before you edit anything</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            This board separates capability quality, delivery pressure, trust, and wallet visibility so the studio feels like a business dashboard instead of one long form.
          </p>
        </div>
        <div className="rounded-full border border-[rgba(99,102,241,0.16)] bg-[rgba(238,242,255,0.94)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Current studio snapshot
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {signalChips.map((item) => (
          <div
            key={item.label}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/92 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
            <span className="text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-[26px] border border-[var(--line)] bg-[rgba(248,250,252,0.94)] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Capability quality map</p>
            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Signal map
            </span>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <svg viewBox="0 0 180 180" className="size-44">
              <circle cx="90" cy="90" r={ringRadius} fill="none" stroke="rgba(226,232,240,0.9)" strokeWidth="18" />
              {ringSegments.map((segment, index) => (
                <circle
                  key={index}
                  cx="90"
                  cy="90"
                  r={ringRadius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="18"
                  strokeDasharray={`${segment.dash} ${circumference}`}
                  strokeDashoffset={segment.offset}
                  strokeLinecap="round"
                  transform="rotate(-90 90 90)"
                />
              ))}
              <text x="90" y="86" textAnchor="middle" fill="var(--text-primary)" fontSize="34" fontWeight="700">
                {totalServices}
              </text>
              <text x="90" y="108" textAnchor="middle" fill="var(--text-secondary)" fontSize="11" style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                lanes
              </text>
            </svg>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="size-2.5 rounded-full bg-[var(--accent-teal)]" />
                  Proof-backed lanes
                </span>
              <span className="text-[var(--text-primary)]">{reviewBackedLanes}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                <span className="size-2.5 rounded-full bg-[var(--accent-amber)]" />
                Needs polish
              </span>
              <span className="text-[var(--text-primary)]">{needsPolishLanes}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                <span className="size-2.5 rounded-full bg-[var(--accent-coral)]" />
                Inactive
              </span>
              <span className="text-[var(--text-primary)]">{inactiveServices}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Latest value', formatCompactMoney(safeTrendPoints[safeTrendPoints.length - 1]?.value ?? 0, currency)],
              ['Peak value', formatCompactMoney(peakValue, currency)],
              ['Visible balance', formatCompactMoney(availableBalance, currency)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[26px] border border-[var(--line)] bg-[rgba(248,250,252,0.94)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Recent booking value</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">This graph follows the most recent booking amounts already attached to the studio.</p>
                </div>
                <div className="rounded-full border border-[rgba(56,189,248,0.16)] bg-[rgba(240,249,255,0.94)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
                  Real booking flow
                </div>
              </div>

              <div className="mt-5">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-44 w-full">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = paddingY + ratio * (chartHeight - paddingY * 2);
                    return (
                      <line
                        key={ratio}
                        x1={paddingX}
                        x2={chartWidth - paddingX}
                        y1={y}
                        y2={y}
                        stroke="rgba(148,163,184,0.16)"
                        strokeWidth="1"
                        strokeDasharray="4 7"
                      />
                    );
                  })}
                  <path d={trendArea} fill="url(#vendorTrendFill)" />
                  <path d={trendLine} fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" />
                  {safeTrendPoints.map((point, index) => {
                    const x = paddingX + index * stepX;
                    const y = chartHeight - paddingY - (point.value / maxValue) * (chartHeight - paddingY * 2);

                    return (
                      <g key={`${point.label}-${index}`}>
                        <circle cx={x} cy={y} r="4.5" fill="var(--accent-cyan)" />
                        <text x={x} y={chartHeight - 4} textAnchor="middle" fill="var(--text-tertiary)" fontSize="11">
                          {point.label}
                        </text>
                      </g>
                    );
                  })}
                  <defs>
                    <linearGradient id="vendorTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(56,189,248,0.24)" />
                      <stop offset="100%" stopColor="rgba(56,189,248,0.04)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <div className="rounded-[22px] border border-[rgba(20,184,166,0.16)] bg-[rgba(240,253,250,0.94)] p-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Available balance</p>
                <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{formatCompactMoney(availableBalance, currency)}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Ready vendor balance</p>
              </div>
              <div className="rounded-[22px] border border-[rgba(139,92,246,0.16)] bg-[rgba(245,243,255,0.94)] p-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Engagements</p>
                <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{engagementCount}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Bookings in the studio flow</p>
              </div>
              <div className="rounded-[22px] border border-[rgba(249,115,22,0.16)] bg-[rgba(255,247,237,0.94)] p-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Trust score</p>
                <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{typeof trustScore === 'number' ? trustScore : '--'}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Marketplace trust posture</p>
              </div>
              <div className="rounded-[22px] border border-[rgba(245,158,11,0.16)] bg-[rgba(255,251,235,0.94)] p-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Release ratio</p>
                <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{typeof releaseRatio === 'number' ? `${Math.round(releaseRatio * 100)}%` : '--'}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Protected work settled cleanly</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { label: 'Lane coverage', value: laneCoverage, tone: 'var(--accent-teal)' },
              { label: 'Review coverage', value: reviewCoverage, tone: 'var(--accent-amber)' },
              { label: 'Delivery pressure', value: deliveryPressure, tone: 'var(--accent-cyan)' },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[var(--line)] bg-[rgba(248,250,252,0.94)] p-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
                  <span className="text-sm text-[var(--text-primary)]">{item.value}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[rgba(226,232,240,0.9)]">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(item.value, 100)}%`,
                      backgroundColor: item.tone,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
