'use client';

import {
  AlertTriangle,
  BellRing,
  Landmark,
  MessageSquareMore,
  ShieldAlert,
  WalletCards,
} from 'lucide-react';

export type NotificationCategory =
  | 'all'
  | 'finance'
  | 'escrow'
  | 'message'
  | 'risk'
  | 'platform';

export const PAGE_SIZE = 10;
export const NOTIFICATIONS_STALE_MS = 60_000;

export const notificationCategoryMeta = {
  all: { label: 'All', icon: BellRing },
  finance: { label: 'Finance', icon: Landmark },
  escrow: { label: 'Escrow', icon: WalletCards },
  message: { label: 'Messages', icon: MessageSquareMore },
  risk: { label: 'Risk', icon: ShieldAlert },
  platform: { label: 'Platform', icon: AlertTriangle },
} satisfies Record<
  NotificationCategory,
  { label: string; icon: typeof BellRing }
>;

export function formatNotificationDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}
