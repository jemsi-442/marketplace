interface TrendDatum {
  label: string;
  value: number;
  timestamp?: number | null;
}

interface PlotPoint {
  x: number;
  y: number;
}

interface TrendGeometryOptions {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  minValue?: number;
  maxValue?: number;
}

interface RingSegmentInput {
  label: string;
  value: number;
  color: string;
}

export interface RingSegmentGeometry extends RingSegmentInput {
  dash: number;
  offset: number;
  percentage: number;
}

const ACCENT_RGB_BY_TOKEN: Record<string, string> = {
  'var(--accent-cyan)': '56, 189, 248',
  'var(--accent-teal)': '20, 184, 166',
  'var(--accent-amber)': '245, 158, 11',
  'var(--accent-coral)': '249, 115, 22',
  'var(--accent-violet)': '139, 92, 246',
  'var(--accent-slate)': '100, 116, 139',
  'var(--brand-primary)': '79, 70, 229',
  'var(--brand-primary-strong)': '55, 48, 163',
};

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function formatCompactMoney(valueMinor: number, currency = 'TZS'): string {
  return `${new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: valueMinor >= 100_000 ? 1 : 0,
  }).format(valueMinor / 100)} ${currency}`;
}

export function accentToRgba(color: string, alpha: number): string {
  const rgb = ACCENT_RGB_BY_TOKEN[color];
  if (rgb) {
    return `rgba(${rgb}, ${alpha})`;
  }

  return color;
}

export function parseTimestamp(value?: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function formatChartDateLabel(value?: string | null, fallback = 'N/A'): string {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });
}

export function buildTrendGeometry<T extends TrendDatum>(
  points: T[],
  {
    width,
    height,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    minValue = 0,
    maxValue,
  }: TrendGeometryOptions,
) {
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const safeMaxValue = Math.max(maxValue ?? Math.max(...points.map((point) => point.value), minValue, 0), minValue + 1);
  const valueRange = Math.max(safeMaxValue - minValue, 1);
  const timestamps = points.map((point) => point.timestamp).filter((timestamp): timestamp is number => typeof timestamp === 'number');
  const minTimestamp = timestamps.length ? Math.min(...timestamps) : undefined;
  const maxTimestamp = timestamps.length ? Math.max(...timestamps) : undefined;
  const useTimeScale = typeof minTimestamp === 'number' && typeof maxTimestamp === 'number' && maxTimestamp > minTimestamp;

  const plotPoints = points.map((point, index) => {
    const ratio = useTimeScale && typeof point.timestamp === 'number'
      ? (point.timestamp - minTimestamp) / Math.max(maxTimestamp - minTimestamp, 1)
      : index / Math.max(points.length - 1, 1);
    const x = paddingLeft + ratio * chartWidth;
    const y = paddingTop + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

    return {
      x,
      y,
      value: point.value,
      label: point.label,
      datum: point,
    };
  });

  const linePath = plotPoints.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const baseY = paddingTop + chartHeight;
  const areaPath = plotPoints.length
    ? `${linePath} L ${plotPoints[plotPoints.length - 1]?.x ?? paddingLeft} ${baseY} L ${plotPoints[0]?.x ?? paddingLeft} ${baseY} Z`
    : '';

  return {
    chartHeight,
    chartWidth,
    minValue,
    maxValue: safeMaxValue,
    baseY,
    plotPoints,
    linePath,
    areaPath,
  };
}

export function buildSmoothPath(points: PlotPoint[], tension = 0.2): string {
  if (!points.length) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
  }

  if (points.length === 2) {
    return points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  }

  let path = `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;

    if (!current || !next) {
      continue;
    }

    const controlPoint1X = current.x + ((next.x - previous.x) * tension) / 3;
    const controlPoint1Y = current.y + ((next.y - previous.y) * tension) / 3;
    const controlPoint2X = next.x - ((afterNext.x - current.x) * tension) / 3;
    const controlPoint2Y = next.y - ((afterNext.y - current.y) * tension) / 3;

    path += ` C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${next.x} ${next.y}`;
  }

  return path;
}

export function createLinearTicks(maxValue: number, count = 4): number[] {
  if (count <= 1) {
    return [Math.max(0, maxValue)];
  }

  return Array.from({ length: count }, (_, index) => {
    const ratio = (count - 1 - index) / (count - 1);
    return Math.round(maxValue * ratio);
  });
}

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getSharePercentage(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function buildRingSegments(segments: RingSegmentInput[], radius: number): { total: number; segments: RingSegmentGeometry[] } {
  const total = Math.max(
    segments.reduce((sum, segment) => sum + segment.value, 0),
    1,
  );
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const geometry = segments.map((segment) => {
    const dash = (segment.value / total) * circumference;
    const item = {
      ...segment,
      dash,
      offset,
      percentage: getSharePercentage(segment.value, total),
    };
    offset -= dash;

    return item;
  });

  return {
    total,
    segments: geometry,
  };
}
