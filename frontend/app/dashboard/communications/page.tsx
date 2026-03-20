'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const messageSchema = z.object({
  receiverId: z.number().int().positive('Choose a recipient'),
  content: z.string().min(2, 'Message is too short').max(2000, 'Message is too long'),
});

type MessageFormValues = z.infer<typeof messageSchema>;

export default function CommunicationsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

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
    onSuccess: async (response) => {
      setFeedback(response.message);
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
      setFeedback(error instanceof Error ? error.message : 'Unable to send message');
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    await sendMessage.mutateAsync(values);
  });

  return (
    <DashboardShell
      title="Conversation inbox"
      subtitle="This workspace shows live marketplace conversations from the backend and now supports safe outbound replies to known counterparties from existing conversation history."
    >
      <Card>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Inbox stream</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Marketplace conversations</h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {messages.data?.length ?? 0} messages
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {messages.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading inbox...</p> : null}
          {messages.isError ? <p className="text-sm text-rose-300">{messages.error instanceof Error ? messages.error.message : 'Unable to load messages'}</p> : null}
          {messages.data?.map((message) => {
            const isOutgoing = message.senderId === user?.id;

            return (
              <div key={message.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
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
                  <div className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--brand-secondary)]">
                    {isOutgoing ? 'sent' : 'received'}
                  </div>
                </div>
              </div>
            );
          })}
          {!messages.isLoading && !messages.data?.length ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 text-sm text-[var(--text-secondary)]">
              No conversations yet. Once clients and vendors start coordinating, this feed will populate automatically from the live backend inbox.
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Secure composer</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Reply to known contacts</h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {contacts.length} known contacts
          </div>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
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
              {form.formState.errors.content ? <p className="text-sm text-rose-300">{form.formState.errors.content.message}</p> : null}
            </div>
          </div>

          {feedback ? (
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--text-primary)]">
              {feedback}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={sendMessage.isPending || !contacts.length}>
              {sendMessage.isPending ? 'Sending...' : 'Send message'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFeedback(null);
                form.reset({
                  receiverId: contacts[0]?.id ?? 0,
                  content: '',
                });
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--panel-muted)] text-[var(--brand-secondary)]">
            <MessagesSquare className="size-5" />
          </div>
          <div>
            <p className="font-display text-xl text-[var(--text-primary)]">Next integration edge</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              The clean next backend upgrade is a booking-scoped counterpart directory so we can start brand-new conversations from a booking or service card, not only from existing inbox history. For now, this composer is intentionally constrained to known participants.
            </p>
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}
