import type { BookingEscrowSummary } from '@/lib/types';

export const BOOKING_THREAD_REFRESH_MS = 45_000;
export const BOOKING_WORKSPACE_STALE_MS = 30_000;

export type BookingInlineSuccessScope =
  | 'escrow'
  | 'collection'
  | 'release'
  | 'dispute'
  | 'message'
  | 'delivery';

export interface BookingInlineSuccessState {
  scope: BookingInlineSuccessScope;
  message: string;
}

export function getFormErrorMessages(errors: Record<string, unknown>): string[] {
  return Object.values(errors)
    .map((error) => {
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
      }

      return null;
    })
    .filter((message): message is string => Boolean(message));
}

export function formatBuyerMoney(amount?: number | null, currency = 'TZS'): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '--';
  }

  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function getClientPaymentStatusLabel(status?: string | null): string {
  switch (status) {
    case 'CREATED':
      return 'Ready for payment';
    case 'ACTIVE':
      return 'Payment protected';
    case 'DISPUTED':
      return 'Under review';
    case 'RELEASED':
      return 'Payment released';
    case 'REFUNDED':
      return 'Payment returned';
    case 'RESOLVED':
      return 'Review completed';
    default:
      return 'Protection needed';
  }
}

export function getRolePaymentStatusLabel(status: string | null | undefined, isClient: boolean, isVendor: boolean): string {
  if (isClient) {
    return getClientPaymentStatusLabel(status);
  }

  if (!status) {
    return isVendor ? 'Waiting for client payment setup' : 'Protection needed';
  }

  switch (status) {
    case 'CREATED':
      return isVendor ? 'Waiting for client payment' : 'Ready for payment';
    case 'ACTIVE':
      return 'Payment protected';
    case 'DISPUTED':
      return 'Under review';
    case 'RELEASED':
      return isVendor ? 'Payment released to payout flow' : 'Payment released';
    case 'REFUNDED':
      return 'Payment returned';
    case 'RESOLVED':
      return 'Review completed';
    default:
      return isVendor ? 'Waiting for client payment setup' : 'Protection needed';
  }
}

function getClientNextMoveLabel(status?: string | null): string {
  switch (status) {
    case 'CREATED':
      return 'Complete payment';
    case 'ACTIVE':
      return 'Review the work';
    case 'DISPUTED':
      return 'Wait for review';
    case 'RELEASED':
      return 'Leave feedback';
    case 'REFUNDED':
      return 'Review the outcome';
    case 'RESOLVED':
      return 'Check the outcome';
    default:
      return 'Protect payment';
  }
}

export function getRolePaymentTitle(isClient: boolean, isVendor: boolean): string {
  if (isClient) {
    return 'Payment status';
  }

  if (isVendor) {
    return 'Client payment status';
  }

  return 'Client payment lane';
}

export function getRolePaymentEmptyStatus(isClient: boolean, isVendor: boolean): string {
  if (isClient) {
    return 'Protection needed';
  }

  if (isVendor) {
    return 'Waiting for client payment setup';
  }

  return 'Waiting for client payment setup';
}

export function getRoleNextMoveLabel(status: string | null | undefined, isClient: boolean, isVendor: boolean): string {
  if (isClient) {
    return getClientNextMoveLabel(status);
  }

  if (!status) {
    return isVendor ? 'Wait for client payment' : 'Review client payment progress';
  }

  switch (status) {
    case 'CREATED':
      return isVendor ? 'Wait for client payment' : 'Track payment request progress';
    case 'ACTIVE':
      return isVendor ? 'Continue delivery updates' : 'Review delivery and payment progress';
    case 'DISPUTED':
      return isVendor ? 'Wait for admin review' : 'Continue review';
    case 'RELEASED':
      return isVendor ? 'Check payout progress' : 'Close the payment review';
    case 'REFUNDED':
      return 'Review the outcome';
    case 'RESOLVED':
      return 'Check the outcome';
    default:
      return isVendor ? 'Wait for client payment' : 'Review client payment progress';
  }
}

export function getRoleBookingNextStep(status: string | null | undefined, isClient: boolean, isVendor: boolean): string {
  if (!status) {
    if (isClient) {
      return 'Protect the payment first so this booking can move into a safe payment step.';
    }

    if (isVendor) {
      return 'Wait for the client to protect payment before treating this booking as active work.';
    }

    return 'Watch for the client payment setup before this booking moves into active delivery.';
  }

  switch (status) {
    case 'CREATED':
      if (isClient) {
        return 'Complete the payment request so this booking can move into protected delivery.';
      }

      if (isVendor) {
        return 'Wait for client payment confirmation before continuing delivery work.';
      }

      return 'Track the payment request until the client funding step completes.';

    case 'ACTIVE':
      if (isClient) {
        return 'Review the work carefully, then confirm release only when everything looks right.';
      }

      if (isVendor) {
        return 'Use the thread for progress and delivery updates while the protected work stays active.';
      }

      return 'Review delivery and payment activity, then step in only if the booking needs help.';

    case 'DISPUTED':
      if (isClient) {
        return 'Wait for review and keep any follow-up focused on the work, delivery, and evidence.';
      }

      if (isVendor) {
        return 'Wait for admin review and keep all follow-up tied to evidence and delivery facts.';
      }

      return 'Review the dispute trail and keep the booking communication focused on evidence.';

    default:
      if (isClient) {
        return 'Review the final record and leave feedback if the work is complete.';
      }

      if (isVendor) {
        return 'Review the final booking record and wait for the next platform update if needed.';
      }

      return 'Review the final booking record and move back to the queue if no further action is needed.';
  }
}

export function getEscrowResolutionLabel(resolution?: string | null): string | null {
  switch (resolution) {
    case 'VENDOR_RELEASE':
      return 'Released to vendor';
    case 'CLIENT_REFUND_EXTERNAL':
      return 'Refunded to client';
    default:
      return resolution?.trim() ? resolution.replaceAll('_', ' ') : null;
  }
}

export function hasEscrowReviewContext(escrow?: BookingEscrowSummary | null): boolean {
  if (!escrow) {
    return false;
  }

  return Boolean(
    escrow.dispute_reason?.trim()
      || escrow.dispute_source?.trim()
      || escrow.resolution?.trim()
      || escrow.resolution_note?.trim()
      || escrow.evidence_summary?.trim()
      || escrow.tags?.length
      || escrow.disputed_at
      || escrow.resolved_at,
  );
}

export function getDeliveryStatusTone(status?: string | null): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'submitted':
      return 'info';
    case 'changes_requested':
      return 'warning';
    case 'approved':
      return 'success';
    default:
      return 'neutral';
  }
}

export function formatAttachmentSize(sizeBytes?: number | null): string {
  if (!sizeBytes || sizeBytes <= 0) {
    return 'File ready';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}

export function resolveAttachmentMimeType(file: File): string {
  if (file.type && file.type.trim() !== '') {
    return file.type;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  return (
    {
      pdf: 'application/pdf',
      zip: 'application/zip',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
    }[extension] ?? 'application/octet-stream'
  );
}

export function isDirectDeliveryUploadUnavailable(error: Error): boolean {
  return error.message.includes('Direct delivery upload is not available');
}

export async function uploadAttachmentToDirectTarget(
  url: string,
  method: string,
  headers: Record<string, string>,
  file: File,
): Promise<void> {
  const response = await fetch(url, {
    method,
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Direct upload failed with status ${response.status}`);
  }
}
