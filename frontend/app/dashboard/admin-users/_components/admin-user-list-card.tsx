'use client';

import { Search, Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminUserRecord } from '@/lib/types';

import {
  ADMIN_USER_FILTER_LABELS,
  formatAdminUserDateTime,
  getAdminAccountTypeLabel,
  type UserFilter,
} from '../admin-users.utils';

interface AdminUserListCardProps {
  currentPage: number;
  filter: UserFilter;
  paginatedUsers: AdminUserRecord[];
  search: string;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  onApplyFilter: (filter: UserFilter) => void;
  onSearchChange: (value: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function AdminUserListCard({
  currentPage,
  filter,
  paginatedUsers,
  search,
  totalPages,
  isLoading,
  isError,
  onApplyFilter,
  onSearchChange,
  onPreviousPage,
  onNextPage,
}: AdminUserListCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            User list
          </p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            One page per account
          </h2>
        </div>
        <Link href="/dashboard/admin-users/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">New user</Button>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search users"
            className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ADMIN_USER_FILTER_LABELS.map((option) => {
            const active = filter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onApplyFilter(option.value)}
                className={
                  active
                    ? 'rounded-full border border-[rgba(79,70,229,0.18)] bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(79,70,229,0.18)]'
                    : 'rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-[22px]" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="Users are not loading right now"
            description="Refresh and try again in a moment."
          />
        ) : !paginatedUsers.length ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No users in this view"
            description="Change the search or filter, or create a new account from the new user page."
            action={
              <Link
                href="/dashboard/admin-users/new"
                className="w-full sm:w-auto"
              >
                <Button className="w-full sm:w-auto">
                  Open new user page
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {paginatedUsers.map((target) => (
              <div
                key={target.id}
                className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {target.email}
                      </p>
                      <StatusBadge
                        label={getAdminAccountTypeLabel(target.account_type)}
                        tone="info"
                      />
                      {target.is_verified ? (
                        <StatusBadge label="Verified" tone="success" />
                      ) : (
                        <StatusBadge label="Unverified" tone="warning" />
                      )}
                      {target.is_locked ? (
                        <StatusBadge label="Locked" tone="warning" />
                      ) : (
                        <StatusBadge label="Active" tone="success" />
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Created: {formatAdminUserDateTime(target.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/admin-users/${target.id}`}
                      className="w-full sm:w-auto"
                    >
                      <Button className="w-full sm:w-auto" variant="ghost">
                        Open user
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}

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
        )}
      </div>
    </Card>
  );
}
