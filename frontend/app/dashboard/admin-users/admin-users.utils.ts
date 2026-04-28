'use client';

import type { AdminUserRecord } from '@/lib/types';

export type UserFilter =
  | 'all'
  | 'client'
  | 'vendor'
  | 'admin'
  | 'locked'
  | 'unverified';

export const ADMIN_USER_FILTER_LABELS: Array<{
  value: UserFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'client', label: 'Clients' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'admin', label: 'Admins' },
  { value: 'locked', label: 'Locked' },
  { value: 'unverified', label: 'Unverified' },
];

export const PAGE_SIZE = 10;
export const ADMIN_USERS_STALE_MS = 60_000;

export function getAdminAccountTypeLabel(
  type: AdminUserRecord['account_type'],
): string {
  switch (type) {
    case 'super_admin':
      return 'Super admin';
    case 'admin':
      return 'Admin';
    case 'vendor':
      return 'Vendor';
    default:
      return 'Client';
  }
}

export function formatAdminUserDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}
