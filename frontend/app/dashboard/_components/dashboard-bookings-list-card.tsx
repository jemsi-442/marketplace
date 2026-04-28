'use client';

import { ArrowRight, ClipboardList, Search } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { getBookingStatusTone, getEscrowStatusTone } from '@/lib/status';
import type { BookingListResponse } from '@/lib/types';

import {
  dashboardBookingViewOptions,
  getDashboardBookingMeta,
  type DashboardBookingView,
} from '../dashboard-bookings.utils';

type BookingItem = BookingListResponse['items'][number];

interface DashboardBookingsListCardProps {
  bookingItems: BookingItem[];
  currentPage: number;
  isError: boolean;
  isLoading: boolean;
  search: string;
  summary: {
    total: number;
    active: number;
    protected: number;
    unread: number;
  };
  totalPages: number;
  view: DashboardBookingView;
  onApplyView: (view: DashboardBookingView) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSearchChange: (value: string) => void;
}

export function DashboardBookingsListCard({
  bookingItems,
  currentPage,
  isError,
  isLoading,
  search,
  summary,
  totalPages,
  view,
  onApplyView,
  onPreviousPage,
  onNextPage,
  onSearchChange,
}: DashboardBookingsListCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Booking list
        </p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          Open one booking at a time
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search booking, request, or service"
            className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {dashboardBookingViewOptions.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onApplyView(filter.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                view === filter.value
                  ? 'border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] text-[var(--brand-primary)]'
                  : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-[22px]" />
            ))
          ) : isError ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="Bookings are not loading right now"
              description="Refresh and try again in a moment."
            />
          ) : !summary.total ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="No bookings yet"
              description="Open lanes or requests first, then come back here when work is active."
            />
          ) : !bookingItems.length ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="No bookings in this view"
              description="Try another filter to bring the right booking lane into view."
            />
          ) : (
            <>
              {bookingItems.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {booking.service_title}
                        </p>
                        <StatusBadge
                          label={booking.status}
                          tone={getBookingStatusTone(booking.status)}
                        />
                        {booking.escrow ? (
                          <StatusBadge
                            label={booking.escrow.status}
                            tone={getEscrowStatusTone(booking.escrow.status)}
                          />
                        ) : null}
                        {typeof booking.unread_thread_count === 'number' &&
                        booking.unread_thread_count > 0 ? (
                          <StatusBadge
                            label={`${booking.unread_thread_count} unread`}
                            tone="warning"
                          />
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {booking.request_summary}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                        {getDashboardBookingMeta(booking).map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </div>
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <Button>
                        Open booking
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </Link>
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
                      variant="ghost"
                      onClick={onPreviousPage}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={onNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
