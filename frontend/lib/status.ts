import type { BookingRecord } from '@/lib/types';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

export function getBookingStatusTone(status: string | null | undefined): StatusTone {
  switch (normalizeStatus(status)) {
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    case 'OPEN':
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getEscrowStatusTone(status: string | null | undefined): StatusTone {
  switch (normalizeStatus(status)) {
    case 'RELEASED':
    case 'RESOLVED':
      return 'success';
    case 'DISPUTED':
      return 'danger';
    case 'CREATED':
      return 'warning';
    case 'FUNDED':
    case 'ACTIVE':
      return 'info';
    default:
      return 'neutral';
  }
}

export function getRiskLevelTone(level: string | null | undefined): StatusTone {
  switch (normalizeStatus(level)) {
    case 'CRITICAL':
    case 'HIGH':
      return 'danger';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'success';
    default:
      return 'neutral';
  }
}

export function getVerificationTone(isVerified: boolean): StatusTone {
  return isVerified ? 'success' : 'warning';
}

export function getLockTone(isLocked: boolean): StatusTone {
  return isLocked ? 'danger' : 'info';
}

export interface BookingProgressStep {
  key: string;
  label: string;
  state: 'done' | 'current' | 'pending' | 'risk';
}

export function getBookingProgressSteps(booking: Pick<BookingRecord, 'status' | 'escrow'>): BookingProgressStep[] {
  const hasEscrow = Boolean(booking.escrow);
  const escrowStatus = normalizeStatus(booking.escrow?.status);
  const bookingStatus = normalizeStatus(booking.status);
  const isClosed = bookingStatus === 'COMPLETED' || bookingStatus === 'CANCELLED' || escrowStatus === 'RELEASED' || escrowStatus === 'RESOLVED';
  const isRisk = bookingStatus === 'CANCELLED' || escrowStatus === 'DISPUTED';
  const isActive = escrowStatus === 'FUNDED' || escrowStatus === 'ACTIVE';

  return [
    { key: 'booked', label: 'Booked', state: 'done' },
    {
      key: 'escrow',
      label: 'Escrow',
      state: !hasEscrow ? 'current' : 'done',
    },
    {
      key: 'active',
      label: 'In progress',
      state: isRisk ? 'risk' : isActive ? 'current' : hasEscrow ? 'pending' : 'pending',
    },
    {
      key: 'closed',
      label: isRisk ? 'Review' : 'Closed',
      state: isRisk ? 'risk' : isClosed ? 'done' : 'pending',
    },
  ];
}
