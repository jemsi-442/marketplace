'use client';

import { BellRing, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import type { NotificationRecord } from '@/lib/types';

import {
  formatNotificationDateTime,
  notificationCategoryMeta,
  type NotificationCategory,
} from '../notifications.utils';

interface NotificationListCardProps {
  categoryFilter: NotificationCategory;
  currentPage: number;
  notifications: NotificationRecord[];
  notificationSearch: string;
  pendingNotificationId: number | null;
  totalPages: number;
  isLoading: boolean;
  isMarkingRead: boolean;
  onApplyCategoryFilter: (value: NotificationCategory) => void;
  onNotificationSearchChange: (value: string) => void;
  onMarkRead: (notificationId: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function NotificationListCard({
  categoryFilter,
  currentPage,
  notifications,
  notificationSearch,
  pendingNotificationId,
  totalPages,
  isLoading,
  isMarkingRead,
  onApplyCategoryFilter,
  onNotificationSearchChange,
  onMarkRead,
  onPreviousPage,
  onNextPage,
}: NotificationListCardProps) {
  return (
    <>
      <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <Search className="size-4 text-[var(--text-secondary)]" />
              <input
                value={notificationSearch}
                onChange={(event) =>
                  onNotificationSearchChange(event.target.value)
                }
                placeholder="Search alerts"
                className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                Object.entries(notificationCategoryMeta) as Array<
                  [
                    NotificationCategory,
                    { label: string; icon: typeof BellRing },
                  ]
                >
              ).map(([key, meta]) => {
                const active = categoryFilter === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onApplyCategoryFilter(key)}
                    className={
                      active
                        ? 'rounded-full border border-[var(--brand-primary)] bg-[rgba(59,130,246,0.10)] px-4 py-2 text-sm font-medium text-[var(--brand-primary)]'
                        : 'rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)]'
                    }
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[220px]" />
        </div>
      </Card>

      <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            Alert list
          </p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            Read alerts one by one
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-[22px]" />
              ))
            : null}

          {!isLoading && notifications.length === 0 ? (
            <EmptyState
              icon={<BellRing className="size-5" />}
              title="No alerts in this view"
              description="Change the search or filter."
            />
          ) : null}

          {notifications.map((notification) => {
            const category = (
              notification.category &&
              notification.category in notificationCategoryMeta
                ? notification.category
                : 'platform'
            ) as Exclude<NotificationCategory, 'all'>;
            const meta = notificationCategoryMeta[category];
            const Icon = meta.icon;

            return (
              <div
                key={notification.id}
                className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-[var(--brand-primary)]">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {notification.title}
                        </p>
                        {!notification.isRead ? (
                          <StatusBadge label="Unread" tone="warning" />
                        ) : (
                          <StatusBadge label="Read" tone="neutral" />
                        )}
                        <StatusBadge label={meta.label} tone="info" />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {notification.message}
                      </p>
                      <p className="mt-3 text-xs text-[var(--text-secondary)]">
                        {formatNotificationDateTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  {!notification.isRead ? (
                    <Button
                      className="w-full sm:w-auto"
                      size="sm"
                      onClick={() => onMarkRead(notification.id)}
                      disabled={
                        isMarkingRead &&
                        pendingNotificationId === notification.id
                      }
                    >
                      {isMarkingRead &&
                      pendingNotificationId === notification.id
                        ? 'Updating...'
                        : 'Mark read'}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="w-full sm:w-auto"
                  variant="ghost"
                  onClick={onPreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  variant="ghost"
                  onClick={onNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </>
  );
}
