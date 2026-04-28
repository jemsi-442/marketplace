import type { BookingRecord } from '@/lib/types';

import {
  formatChartDateLabel,
  parseTimestamp,
} from '@/components/dashboard/chart-utils';

export interface AnalyticsTrendPoint {
  label: string;
  value: number;
  timestamp?: number;
}

export function buildRecentBookingTrendPoints(
  bookings: BookingRecord[],
  prefix: string,
  limit = 6,
): AnalyticsTrendPoint[] {
  return [...bookings]
    .sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();

      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return 0;
      }

      return leftTime - rightTime;
    })
    .slice(-limit)
    .map((booking, index) => ({
      label: formatChartDateLabel(booking.created_at, `${prefix}${index + 1}`),
      value: booking.escrow?.amount_minor ?? 0,
      timestamp: parseTimestamp(booking.created_at),
    }));
}
