'use client';

import { MessagesSquare, SendHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuthUser, MessageRecord, ThreadSummaryRecord } from '@/lib/types';

import { formatDateTime } from '../communications.utils';

interface CommunicationsConversationPanelProps {
  draftMessage: string;
  isMessagesError: boolean;
  isMessagesLoading: boolean;
  messages: MessageRecord[];
  selectedThread: ThreadSummaryRecord | null;
  sendPending: boolean;
  user: AuthUser | null | undefined;
  onDraftMessageChange: (value: string) => void;
  onSendMessage: () => void;
}

export function CommunicationsConversationPanel({
  draftMessage,
  isMessagesError,
  isMessagesLoading,
  messages,
  selectedThread,
  sendPending,
  user,
  onDraftMessageChange,
  onSendMessage,
}: CommunicationsConversationPanelProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Conversation
        </p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
          Read first, reply second
        </h2>
      </div>
      <div className="mt-4 space-y-4">
        {!selectedThread ? (
          <EmptyState
            icon={<MessagesSquare className="size-5" />}
            title="No thread selected yet"
            description="Choose a request or booking thread first."
          />
        ) : isMessagesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : isMessagesError ? (
          <EmptyState
            icon={<MessagesSquare className="size-5" />}
            title="This thread is not loading right now"
            description="Refresh and try again in a moment."
          />
        ) : (
          <>
            <div className="space-y-3">
              {messages.length ? (
                messages.map((message) => {
                  const isMine = message.senderId === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={
                        isMine
                          ? 'rounded-2xl border border-[rgba(59,130,246,0.12)] bg-[rgba(59,130,246,0.06)] p-4'
                          : 'rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4'
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {isMine ? 'You' : message.senderLabel}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                        {message.content}
                      </p>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={<MessagesSquare className="size-5" />}
                  title="No messages yet"
                  description="You can start this thread from here when a real platform update is needed."
                />
              )}
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <div className="space-y-3">
                <textarea
                  value={draftMessage}
                  onChange={(event) => onDraftMessageChange(event.target.value)}
                  rows={4}
                  placeholder="Write a clear update for this thread"
                  className="w-full resize-none rounded-2xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--text-secondary)]">
                    {draftMessage.trim().length >= 2
                      ? 'This thread update is ready to send.'
                      : 'Write at least a short message before sending.'}
                  </p>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={onSendMessage}
                    disabled={sendPending || draftMessage.trim().length < 2}
                  >
                    {sendPending ? 'Sending...' : 'Send update'}
                    <SendHorizontal className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
