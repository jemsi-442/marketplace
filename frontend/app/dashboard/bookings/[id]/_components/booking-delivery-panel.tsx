import type { ComponentProps } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Layers3, Link2, Paperclip, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import type { DeliveryRecord } from '@/lib/types';

import type { DeliveryFormValues } from '../booking-workspace.schemas';
import type { BookingInlineSuccessState } from '../booking-workspace.utils';
import { formatAttachmentSize, formatDateTime, getDeliveryStatusTone } from '../booking-workspace.utils';

interface BookingDeliveryPanelProps {
  isVendor: boolean;
  isAdmin: boolean;
  deliveriesLoading: boolean;
  deliveries: DeliveryRecord[];
  deliveryFiles: File[];
  deliveryReady: boolean;
  deliveryErrors: string[];
  inlineSuccess: BookingInlineSuccessState | null;
  pendingDeliveryDeleteId: number | null;
  pendingAttachmentDeleteId: number | null;
  deliveryForm: UseFormReturn<DeliveryFormValues>;
  submitDeliveryPending: boolean;
  onDeliverySubmit: ComponentProps<'form'>['onSubmit'];
  onSetDeliveryFiles: (files: File[]) => void;
  onClearDraft: () => void;
  onDeleteDelivery: (deliveryId: number) => void;
  onDeleteAttachment: (deliveryId: number, attachmentId: number) => void;
  onAttachmentDownload: (attachmentId: number, currentUrl: string) => void;
}

export function BookingDeliveryPanel({
  isVendor,
  isAdmin,
  deliveriesLoading,
  deliveries,
  deliveryFiles,
  deliveryReady,
  deliveryErrors,
  inlineSuccess,
  pendingDeliveryDeleteId,
  pendingAttachmentDeleteId,
  deliveryForm,
  submitDeliveryPending,
  onDeliverySubmit,
  onSetDeliveryFiles,
  onClearDraft,
  onDeleteDelivery,
  onDeleteAttachment,
  onAttachmentDownload,
}: BookingDeliveryPanelProps) {
  return (
    <Card className="space-y-4 rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Delivery</p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Submitted work</h2>
      </div>
      {isVendor ? (
        <form className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-4" onSubmit={onDeliverySubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-delivery-note">Delivery note</label>
            <textarea
              id="booking-delivery-note"
              rows={5}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
              placeholder="Explain what is ready, what the client should review, and any handoff details."
              {...deliveryForm.register('delivery_note')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-delivery-link">Optional delivery link</label>
            <input
              id="booking-delivery-link"
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
              placeholder="https://example.com/final-handoff"
              {...deliveryForm.register('delivery_link')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-delivery-files">Attachments</label>
            <input
              id="booking-delivery-files"
              type="file"
              multiple
              onChange={(event) => onSetDeliveryFiles(Array.from(event.target.files ?? []))}
              className="block w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-primary)]"
            />
            <p className="text-xs text-[var(--text-secondary)]">Attach files if needed. Large attachments stay under the 15 MB per-file limit.</p>
          </div>
          {deliveryFiles.length ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Files ready</p>
              <div className="mt-3 space-y-2">
                {deliveryFiles.map((file) => (
                  <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3">
                    <span className="truncate text-[var(--text-primary)]">{file.name}</span>
                    <span>{formatAttachmentSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {deliveryErrors.length ? (
            <div id="booking-delivery-summary" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {deliveryErrors.join(' ')}
            </div>
          ) : null}
          {deliveryReady ? <InlineStateNote tone="success" message="Delivery note is ready to submit." /> : null}
          {inlineSuccess?.scope === 'delivery' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
          <div className="flex flex-wrap gap-3">
            <Button className="w-full sm:w-auto" type="submit" disabled={submitDeliveryPending}>
              {submitDeliveryPending ? 'Submitting delivery...' : 'Submit delivery'}
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onClearDraft}>
              Clear draft
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
          {isAdmin
            ? 'Admin review sees submitted work here after the vendor sends a delivery update.'
            : 'The vendor submits work here once files and handoff notes are ready.'}
        </div>
      )}
      <div className="space-y-3">
        {deliveriesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : deliveries.length ? (
          deliveries.map((delivery) => (
            <div key={delivery.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge label={delivery.status} tone={getDeliveryStatusTone(delivery.status)} />
                <span className="text-xs text-[var(--text-secondary)]">{formatDateTime(delivery.submitted_at)}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{delivery.delivery_note}</p>
              {delivery.delivery_link ? (
                <a href={delivery.delivery_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--brand-primary)]">
                  <Link2 className="size-4" /> Open link
                </a>
              ) : null}
              {delivery.attachments.length ? (
                <div className="mt-4 space-y-2">
                  {delivery.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm">
                      <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <Paperclip className="size-4" />
                        <button
                          type="button"
                          onClick={() => onAttachmentDownload(attachment.id, attachment.file_url)}
                          className="underline-offset-2 hover:underline"
                        >
                          {attachment.file_name}
                        </button>
                        <span className="text-[var(--text-secondary)]">{formatAttachmentSize(attachment.size_bytes)}</span>
                      </div>
                      {isAdmin ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteAttachment(delivery.id, attachment.id)}
                          disabled={pendingAttachmentDeleteId === attachment.id}
                        >
                          <Trash2 className="mr-2 size-4" />
                          {pendingAttachmentDeleteId === attachment.id ? 'Removing...' : 'Remove'}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {isAdmin ? (
                <div className="mt-4">
                  <Button size="sm" variant="ghost" onClick={() => onDeleteDelivery(delivery.id)} disabled={pendingDeliveryDeleteId === delivery.id}>
                    <Trash2 className="mr-2 size-4" />
                    {pendingDeliveryDeleteId === delivery.id ? 'Removing delivery...' : 'Remove delivery'}
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState icon={<Layers3 className="size-5" />} title="No delivery yet" description="Delivery submissions will appear here once work is uploaded." />
        )}
      </div>
    </Card>
  );
}
