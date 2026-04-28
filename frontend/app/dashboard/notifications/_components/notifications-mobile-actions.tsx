'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface NotificationsMobileActionsProps {
  filter: 'all' | 'unread';
  onToggleUnread: () => void;
}

export function NotificationsMobileActions({
  filter,
  onToggleUnread,
}: NotificationsMobileActionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        size="sm"
        variant="ghost"
        className="w-full rounded-2xl border border-[var(--line)]"
        onClick={onToggleUnread}
      >
        {filter === 'unread' ? 'Show all' : 'Show unread'}
      </Button>
      <Link href="/dashboard/communications">
        <Button
          size="sm"
          variant="ghost"
          className="w-full rounded-2xl border border-[var(--line)]"
        >
          Open inbox
        </Button>
      </Link>
    </div>
  );
}
