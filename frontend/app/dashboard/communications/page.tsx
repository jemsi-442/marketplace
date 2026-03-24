'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DraftStatusNote } from '@/components/ui/draft-status-note';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FormActionDock } from '@/components/ui/form-action-dock';
import { FormHint } from '@/components/ui/form-hint';
import { FormValidationSummary } from '@/components/ui/form-validation-summary';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { NextActionHint } from '@/components/ui/next-action-hint';
import { PriorityBanner } from '@/components/ui/priority-banner';
import { SectionNavigator } from '@/components/ui/section-navigator';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkflowSteps } from '@/components/ui/workflow-steps';
import { WorkspaceIdentityBanner } from '@/components/ui/workspace-identity-banner';
import { WorkspaceGuide } from '@/components/ui/workspace-guide';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { useToastStore } from '@/lib/ui/toast-store';
import { cn } from '@/lib/utils';

const messageSchema = z.object({
  receiverId: z.number().int().positive('Choose a recipient'),
  content: z.string().min(2, 'Message is too short').max(2000, 'Message is too long'),
});

type MessageFormValues = z.infer<typeof messageSchema>;

function getFormErrorMessages(errors: Record<string, unknown>): string[] {
  return Object.values(errors)
    .map((error) => {
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
      }

      return null;
    })
    .filter((message): message is string => Boolean(message));
}

export default function CommunicationsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [composerSuccess, setComposerSuccess] = useState<string | null>(null);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageView, setMessageView] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const pushToast = useToastStore((state) => state.push);
  const isAdmin = user?.roles.includes('ROLE_ADMIN') ?? false;
  const isVendor = user?.roles.includes('ROLE_VENDOR') ?? false;
  const defaultWorkspaceHref = isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client';
  const communicationsTone = isAdmin ? 'admin' : isVendor ? 'vendor' : 'client';

  const messages = useQuery({
    queryKey: ['messages-page', token],
    queryFn: () => apiClient.getMessages(token ?? ''),
    enabled: Boolean(token),
  });

  const contacts = useMemo(() => {
    const byUser = new Map<number, { id: number; email: string }>();

    for (const message of messages.data ?? []) {
      if (message.senderId !== user?.id) {
        byUser.set(message.senderId, { id: message.senderId, email: message.senderEmail });
      }

      if (message.receiverId !== user?.id) {
        byUser.set(message.receiverId, { id: message.receiverId, email: message.receiverEmail });
      }
    }

    return Array.from(byUser.values()).sort((left, right) => left.email.localeCompare(right.email));
  }, [messages.data, user?.id]);

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      receiverId: 0,
      content: '',
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (values: MessageFormValues) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.sendMessage(token, values);
    },
    onSuccess: async () => {
      setFeedback(null);
      setComposerSuccess('Message sent. The inbox now reflects the latest update in this conversation.');
      pushToast({
        title: 'Message sent',
        message: 'The conversation thread has been updated.',
        tone: 'success',
      });
      form.reset({
        receiverId: contacts[0]?.id ?? 0,
        content: '',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['messages-page'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-messages'] }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to send message';
      setComposerSuccess(null);
      setFeedback(message);
      pushToast({
        title: 'Message not sent',
        message,
        tone: 'danger',
      });
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    setComposerSuccess(null);
    await sendMessage.mutateAsync(values);
  }, async () => {
    document.getElementById('communications-composer-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function prepareReply(receiverId: number) {
    form.setValue('receiverId', receiverId, { shouldValidate: true, shouldDirty: true });
    setFeedback(null);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  const messageActionHint = (isOutgoing: boolean) =>
    isOutgoing
      ? 'Wait for the reply or return to the related booking if the message needs action there.'
      : 'Reply only if a real next step or clarification is needed for the work in progress.';
  const composerErrors = getFormErrorMessages(form.formState.errors as Record<string, unknown>);
  const filteredMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();

    return (messages.data ?? []).filter((message) => {
      const isOutgoing = message.senderId === user?.id;
      const matchesView =
        messageView === 'all' ||
        (messageView === 'outgoing' && isOutgoing) ||
        (messageView === 'incoming' && !isOutgoing);
      const searchable = `${message.senderEmail} ${message.receiverEmail} ${message.content}`.toLowerCase();
      const matchesSearch = query.length === 0 || searchable.includes(query);

      return matchesView && matchesSearch;
    });
  }, [messageSearch, messageView, messages.data, user?.id]);
  const inboxStateMessage = messageSearch.trim().length > 0
    ? `Showing ${filteredMessages.length} message${filteredMessages.length === 1 ? '' : 's'} for "${messageSearch.trim()}" in the ${messageView} view.`
    : messageView === 'all'
      ? `Showing all ${filteredMessages.length} message${filteredMessages.length === 1 ? '' : 's'} in your inbox stream.`
      : `Showing ${filteredMessages.length} ${messageView} message${filteredMessages.length === 1 ? '' : 's'} in your inbox stream.`;
  const hasInboxFilters = messageView !== 'all' || messageSearch.trim().length > 0;
  const incomingCount = useMemo(
    () => (messages.data ?? []).filter((message) => message.receiverId === user?.id).length,
    [messages.data, user?.id],
  );
  const outgoingCount = useMemo(
    () => (messages.data ?? []).filter((message) => message.senderId === user?.id).length,
    [messages.data, user?.id],
  );
  const communicationsPriority = form.formState.isDirty
    ? {
        title: 'A message draft is still open',
        description: 'Finish the draft or clear it before changing filters again, so the next reply does not get lost while you move around the inbox.',
        tone: 'guidance' as const,
      }
    : incomingCount
      ? {
          title: 'Incoming replies deserve the first read',
          description: 'Start with incoming messages so you can see whether a delivery or clarification already needs a response before writing anything new.',
          tone: 'communication' as const,
        }
      : contacts.length
        ? {
            title: 'Known contacts are ready for a focused follow-up',
            description: 'Open the inbox stream or jump straight to the composer if you already know which active contact needs the next update.',
            tone: 'activity' as const,
          }
        : {
            title: 'The inbox will become useful once real work starts',
            description: 'This screen stays quiet until bookings, service delivery, or account follow-up creates a genuine conversation thread.',
            tone: 'market' as const,
          };

  useEffect(() => {
    if (!form.formState.isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [form.formState.isDirty]);

  return (
    <DashboardShell
      title="Conversation inbox"
      subtitle="Keep service conversations, replies, and follow-ups organised in one secure WOLFIX inbox."
      mobileQuickActions={
        <div className="grid grid-cols-3 gap-2">
          <Link href="#communications-inbox-stream">
            <Button size="sm" variant="ghost" className="w-full">Inbox</Button>
          </Link>
          <Link href="#communications-composer">
            <Button size="sm" className="w-full">Composer</Button>
          </Link>
          <Link href="#communications-note">
            <Button size="sm" variant="ghost" className="w-full">Guide</Button>
          </Link>
        </div>
      }
    >
      <div className="animate-fade-up">
        <WorkspaceGuide
        eyebrow="How to use inbox"
        title="Use this page for replies and follow-up, not for guessing who to contact"
        description="This inbox is easiest to understand when you treat it as the continuation of existing work. Conversations already connected to bookings or active service activity will appear here."
        points={[
          'Read the latest conversation first before writing a response.',
          'Use the composer only for contacts that already exist in your message history.',
          'Keep each message short and tied to a real delivery or account issue.',
          'If you need the full context of one job, return to the booking workspace instead of relying on inbox alone.',
        ]}
        tip={contacts.length ? 'Choose one known contact, send one clear message, then wait for the next reply or alert.' : 'New contacts appear here once a real booking or service interaction has started.'}
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '20ms' }}>
        <WorkspaceIdentityBanner
          tone={communicationsTone}
          title={
            isAdmin
              ? 'This inbox supports operational judgement before action'
              : isVendor
                ? 'This inbox supports delivery follow-up with buyers'
                : 'This inbox supports booking follow-up with providers'
          }
          description={
            isAdmin
              ? 'Use the inbox to gather context before interventions, disputes, or watchlist decisions. It is not your main decision surface, but it helps prevent blind action.'
              : isVendor
                ? 'Use the inbox to keep delivery updates clear, scoped, and tied to active work instead of scattering communication across unrelated threads.'
                : 'Use the inbox to confirm scope, timing, and delivery facts with providers once a booking already exists or protected work is moving.'
          }
          highlights={
            isAdmin
              ? [
                  'Read before intervening.',
                  'Use message context to support a decision, not replace evidence.',
                  'Return to operations once the conversation context is clear.',
                ]
              : isVendor
                ? [
                    'Keep replies tied to active delivery.',
                    'Use short updates instead of long unfocused threads.',
                    'Return to service studio when the next step is operational.',
                  ]
              : [
                  'Use replies to clarify live work, not to browse services.',
                  'Keep each message tied to one booking or deliverable.',
                  'Return to bookings once the next action is clear.',
                ]
          }
          actions={
            <>
              <Button size="sm" onClick={() => document.getElementById('communications-inbox-stream')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                Open inbox stream
              </Button>
              <Link href={defaultWorkspaceHref}>
                <Button size="sm" variant="ghost">Return to workspace</Button>
              </Link>
            </>
          }
        />
      </div>

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '40ms' }}>
        <WorkflowSteps
          eyebrow="Typical communication path"
          title="The cleanest way to handle messages"
          steps={[
            { title: 'Read first', description: 'Check whether the latest message already answers part of the issue.' },
            { title: 'Choose the right contact', description: 'Reply only to the person connected to the current work item.' },
            { title: 'Send one focused message', description: 'Keep the message tied to delivery status, scope, or next action.' },
            { title: 'Return to the workflow', description: 'Go back to the booking or service workspace when the conversation needs action.' },
          ]}
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '80ms' }}>
        <SectionNavigator
          className="mt-6"
          title="Move through inbox without losing the thread"
          description="Use these anchors when you want to read conversations, reply quickly, or return to the guidance note."
          items={[
            { href: '#communications-inbox-stream', label: 'Inbox', helper: 'Read the current thread first.' },
            { href: '#communications-composer', label: 'Composer', helper: 'Send one focused reply.' },
            { href: '#communications-note', label: 'Guide', helper: 'Keep communication tied to real work.' },
          ]}
        />
      </div>

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '120ms' }}>
        <PriorityBanner
          title={communicationsPriority.title}
          description={communicationsPriority.description}
          tone={communicationsPriority.tone}
          actions={
            <>
              <Button
                size="sm"
                variant={incomingCount ? 'primary' : 'ghost'}
                onClick={() => {
                  setMessageView('incoming');
                  document.getElementById('communications-inbox-stream')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Review incoming
              </Button>
              <Button
                size="sm"
                variant={form.formState.isDirty ? 'primary' : 'ghost'}
                onClick={() => {
                  document.getElementById('communications-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Open composer
              </Button>
              <Link href={defaultWorkspaceHref}>
                <Button size="sm" variant={!contacts.length ? 'primary' : 'ghost'}>
                  Return to workspace
                </Button>
              </Link>
              {hasInboxFilters ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMessageSearch('');
                    setMessageView('all');
                  }}
                >
                  Reset inbox view
                </Button>
              ) : null}
            </>
          }
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card variant="communication">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Total thread items</p>
          <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{messages.data?.length ?? 0}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Everything visible in the current inbox account.</p>
        </Card>
        <Card variant="activity">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Incoming</p>
          <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{incomingCount}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Messages that expect reading or a considered reply.</p>
        </Card>
        <Card variant="guidance">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Outgoing</p>
          <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{outgoingCount}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Updates already sent into active conversation threads.</p>
        </Card>
      </div>

      <Card id="communications-inbox-stream" variant="communication" className="scroll-mt-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Inbox stream</p>
            <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(78,137,255,0.14)]">Marketplace conversations</h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {filteredMessages.length} messages
          </div>
        </div>

        <div className="mt-5 grid gap-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.76),rgba(12,29,37,0.56))] p-5">
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-secondary)]" htmlFor="message-search">Search conversations</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                id="message-search"
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
                placeholder="Search contact emails or message content..."
                className="pl-11"
              />
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">View</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All messages' },
                { value: 'incoming', label: 'Incoming only' },
                { value: 'outgoing', label: 'Outgoing only' },
              ].map((option) => {
                const active = messageView === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMessageView(option.value as 'all' | 'incoming' | 'outgoing')}
                    className={cn(
                      'rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition',
                      active
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--ink-strong)]'
                        : 'border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
              {hasInboxFilters ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMessageSearch('');
                    setMessageView('all');
                  }}
                >
                  Reset view
                </Button>
              ) : null}
            </div>
          </div>
          <InlineStateNote message={inboxStateMessage} />
        </div>

        <div className="mt-5 space-y-4">
          {messages.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : null}
          {messages.isError ? (
            <FeedbackBanner
              message={messages.error instanceof Error ? messages.error.message : 'Unable to load messages'}
              tone="danger"
            />
          ) : null}
          {filteredMessages.map((message, index) => {
            const isOutgoing = message.senderId === user?.id;

            return (
              <div
                key={message.id}
                className={cn(
                  'rounded-[24px] border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed',
                  isOutgoing
                    ? 'border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))]'
                    : 'border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))]',
                )}
                style={{ ['--stagger-delay' as string]: `${index * 50}ms` }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      {isOutgoing ? 'Outgoing' : 'Incoming'} · {message.createdAt}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--text-primary)]">{message.senderEmail}</span> →{' '}
                      <span className="text-[var(--text-primary)]">{message.receiverEmail}</span>
                    </p>
                    <p className="mt-4 text-sm leading-7 text-[var(--text-primary)]">{message.content}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={isOutgoing ? 'sent' : 'received'} tone={isOutgoing ? 'info' : 'warning'} />
                    <StatusBadge label="conversation" tone="neutral" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => prepareReply(isOutgoing ? message.receiverId : message.senderId)}
                  >
                    {isOutgoing ? 'Message again' : 'Reply here'}
                  </Button>
                  <Link href="/dashboard/bookings/1">
                    <Button size="sm" variant="ghost">Open booking desk</Button>
                  </Link>
                  <Link href={defaultWorkspaceHref}>
                    <Button size="sm" variant="ghost">Return to workspace</Button>
                  </Link>
                </div>
                <NextActionHint label={messageActionHint(isOutgoing)} />
              </div>
            );
          })}
          {!messages.isLoading && !messages.data?.length ? (
            <EmptyState
              icon={<MessagesSquare className="size-5" />}
              title="No conversations yet"
              description="No booking or service thread has produced a conversation yet. The first meaningful message usually appears only after real work, clarification, or delivery follow-up begins."
              action={
                <div className="flex flex-wrap gap-3">
                  <Link href="/dashboard/client">
                    <Button variant="ghost">Open bookings</Button>
                  </Link>
                  <Link href="/dashboard/client#client-service-catalog">
                    <Button variant="ghost">Browse services</Button>
                  </Link>
                  <Link href={defaultWorkspaceHref}>
                    <Button variant="ghost">Open workspace</Button>
                  </Link>
                </div>
              }
            />
          ) : null}
          {!messages.isLoading && Boolean(messages.data?.length) && !filteredMessages.length ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No messages match this view"
              description="The current search or view is hiding all threads. Reset the inbox view, then start from incoming messages if you need the quickest next step."
              action={
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMessageSearch('');
                      setMessageView('all');
                    }}
                  >
                    Clear inbox filters
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMessageSearch('');
                      setMessageView('incoming');
                    }}
                  >
                    Show incoming only
                  </Button>
                </div>
              }
            />
          ) : null}
        </div>
      </Card>

      <Card id="communications-composer" variant="guidance" className="mt-6 scroll-mt-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Secure composer</p>
            <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(47,107,255,0.14)]">Reply to known contacts</h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {contacts.length} known contacts
          </div>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          {!contacts.length ? (
            <EmptyState
              icon={<MessagesSquare className="size-5" />}
              title="No known contacts yet"
              description="This composer only works with contacts already tied to real marketplace activity. Once a booking or service conversation starts, the recipient list will appear here."
              action={
                <div className="flex flex-wrap gap-3">
                  <Link href="/dashboard/client#client-bookings-rail">
                    <Button variant="ghost">Open bookings rail</Button>
                  </Link>
                  <Link href={defaultWorkspaceHref}>
                    <Button variant="ghost">Return to workspace</Button>
                  </Link>
                </div>
              }
            />
          ) : null}
          <DraftStatusNote
            dirty={form.formState.isDirty}
            isSaving={sendMessage.isPending}
            pristineMessage="No unsaved reply is waiting in the composer right now."
            dirtyMessage="This reply has unsaved text. Send it only when the contact and message are both correct."
            savingMessage="Sending the reply..."
          />
          <div id="communications-composer-summary">
            <FormValidationSummary
              title="The message still needs a few corrections"
              errors={composerErrors}
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="receiverId">Recipient</label>
              <select
                id="receiverId"
                {...form.register('receiverId', { valueAsNumber: true })}
                disabled={!contacts.length}
              >
                <option value={0}>Select a contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.email}
                  </option>
                ))}
              </select>
              <FormHint text="Only known contacts appear here so conversations stay tied to real marketplace activity." />
              {form.formState.errors.receiverId ? <p className="text-sm text-rose-300">{form.formState.errors.receiverId.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="content">Message</label>
              <textarea
                id="content"
                rows={5}
                placeholder={contacts.length ? 'Write a concise operational message or follow-up.' : 'Contacts appear here once a conversation already exists.'}
                {...form.register('content')}
                disabled={!contacts.length}
              />
              <FormHint text="Send one focused message that clearly states the status, question, or next action needed." />
              {form.formState.errors.content ? <p className="text-sm text-rose-300">{form.formState.errors.content.message}</p> : null}
            </div>
          </div>

          {feedback ? <FeedbackBanner message={feedback} tone="info" onDismiss={() => setFeedback(null)} /> : null}
          {composerSuccess ? <InlineStateNote tone="success" message={composerSuccess} /> : null}

          <FormActionDock
            title="Composer actions"
            hint="Send only when the recipient is correct and the message is specific enough to move the work forward."
          >
            <Button type="submit" disabled={sendMessage.isPending || !contacts.length}>
              {sendMessage.isPending ? 'Sending...' : 'Send message'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFeedback(null);
                setComposerSuccess(null);
                form.reset({
                  receiverId: contacts[0]?.id ?? 0,
                  content: '',
                });
              }}
            >
              Reset
            </Button>
            <Link href="/dashboard/bookings/1">
              <Button type="button" variant="ghost">Open booking desk</Button>
            </Link>
          </FormActionDock>
        </form>
      </Card>

      <Card id="communications-note" variant="activity" className="mt-6 scroll-mt-24">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(12,35,91,0.62),rgba(18,64,134,0.42))] text-[var(--brand-secondary)]">
            <MessagesSquare className="size-5" />
          </div>
          <div>
            <p className="font-display text-xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_28px_rgba(47,107,255,0.12)]">Messaging note</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              New conversations currently begin from existing marketplace activity, which helps keep contact flow clean and relevant.
            </p>
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}
