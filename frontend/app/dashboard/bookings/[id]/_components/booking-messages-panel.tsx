import Link from 'next/link';
import type { ComponentProps } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { MessagesSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuthUser, MessageRecord } from '@/lib/types';

import type { MessageFormValues } from '../booking-workspace.schemas';
import type { BookingInlineSuccessState } from '../booking-workspace.utils';
import { formatDateTime } from '../booking-workspace.utils';

interface BookingMessagesPanelProps {
  isAdmin: boolean;
  isVendor: boolean;
  currentUser: AuthUser | null;
  messagesLoading: boolean;
  messages: MessageRecord[];
  messageErrors: string[];
  messageReady: boolean;
  threadReceiverId: number | null;
  inlineSuccess: BookingInlineSuccessState | null;
  messageForm: UseFormReturn<MessageFormValues>;
  sendMessagePending: boolean;
  onMessageSubmit: ComponentProps<'form'>['onSubmit'];
}

export function BookingMessagesPanel({
  isAdmin,
  isVendor,
  currentUser,
  messagesLoading,
  messages,
  messageErrors,
  messageReady,
  threadReceiverId,
  inlineSuccess,
  messageForm,
  sendMessagePending,
  onMessageSubmit,
}: BookingMessagesPanelProps) {
  return (
    <Card className="space-y-4 rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6" id="booking-thread-section">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Thread</p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Booking messages</h2>
      </div>
      <div className="space-y-3">
        {isAdmin ? (
          <EmptyState icon={<MessagesSquare className="size-5" />} title="Open inbox for booking communication" description="Admin-managed booking threads are handled from the inbox." />
        ) : messagesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : messages.length ? (
          messages.map((message) => {
            const outgoing = message.senderId === currentUser?.id;

            return (
              <div key={message.id} className={outgoing ? 'rounded-2xl border border-[rgba(59,130,246,0.12)] bg-[rgba(59,130,246,0.06)] p-4' : 'rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4'}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{outgoing ? 'You' : message.senderLabel}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{formatDateTime(message.createdAt)}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{message.content}</p>
              </div>
            );
          })
        ) : (
          <EmptyState icon={<MessagesSquare className="size-5" />} title="No booking messages yet" description="Use the form below when you need one clear update." />
        )}
      </div>
      {!isAdmin ? (
        <form className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4" onSubmit={onMessageSubmit}>
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="workspace-message-content">Message</label>
            <textarea
              id="workspace-message-content"
              rows={6}
              placeholder={isVendor ? 'Share progress or clarify scope.' : 'Ask a question or confirm the next step.'}
              className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
              {...messageForm.register('content')}
            />
          </div>
          {messageErrors.length ? (
            <div id="booking-message-summary" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {messageErrors.join(' ')}
            </div>
          ) : null}
          {messageReady ? <InlineStateNote tone="success" message="This booking update is ready to send." /> : null}
          {!threadReceiverId ? <InlineStateNote tone="info" message="WOLFIX will route the first booking message to the right admin thread automatically." /> : null}
          {inlineSuccess?.scope === 'message' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
          <div className="flex flex-wrap gap-3">
            <Button className="w-full sm:w-auto" type="submit" disabled={sendMessagePending}>
              {sendMessagePending ? 'Sending update...' : 'Send update'}
            </Button>
            <Link href="/dashboard/communications" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto" type="button" variant="ghost">Open inbox</Button>
            </Link>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
          Use the inbox to message the client or vendor from the correct admin-managed booking thread.
        </div>
      )}
    </Card>
  );
}
