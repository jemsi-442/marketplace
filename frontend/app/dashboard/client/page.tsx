'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign, ShieldAlert, TimerReset } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const collectionSchema = z.object({
  msisdn: z.string().min(8, 'Phone number is required'),
  provider: z.string().min(2, 'Provider is required'),
});
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1200).optional().or(z.literal('')),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;
type ReviewFormValues = z.infer<typeof reviewSchema>;

export default function ClientDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeEscrowId, setActiveEscrowId] = useState<number | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [collectionGatewayPreview, setCollectionGatewayPreview] = useState<string | null>(null);
  const collectionForm = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      msisdn: '',
      provider: 'MPESA',
    },
  });
  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      comment: '',
    },
  });

  const services = useQuery({
    queryKey: ['client-services', token],
    queryFn: () => apiClient.getServices(token),
  });

  const bookings = useQuery({
    queryKey: ['client-bookings', token],
    queryFn: () => apiClient.getBookings(token ?? ''),
    enabled: Boolean(token),
  });

  const createBooking = useMutation({
    mutationFn: async (serviceId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.createBooking(token, serviceId);
    },
    onSuccess: async (response) => {
      setFeedback(`Booking created: #${response.booking_id}`);
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to create booking');
    },
  });
  const createEscrow = useMutation({
    mutationFn: async (bookingId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.createBookingEscrow(token, bookingId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to create escrow');
    },
  });
  const collectPayment = useMutation({
    mutationFn: async (values: CollectionFormValues) => {
      if (!token || !activeEscrowId) {
        throw new Error('Escrow selection missing');
      }

      return apiClient.createCollection(token, activeEscrowId, values.msisdn, values.provider.toUpperCase());
    },
    onSuccess: (response) => {
      setFeedback(`Collection session created for ${response.escrow_reference}`);
      setCollectionGatewayPreview(JSON.stringify(response.gateway, null, 2));
      collectionForm.reset({
        msisdn: '',
        provider: 'MPESA',
      });
      setActiveEscrowId(null);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to initiate collection');
    },
  });
  const releaseEscrow = useMutation({
    mutationFn: async (bookingId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.releaseBookingEscrow(token, bookingId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to release escrow');
    },
  });
  const disputeEscrow = useMutation({
    mutationFn: async (bookingId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.disputeBookingEscrow(token, bookingId, 'Client requested admin review from dashboard');
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to dispute escrow');
    },
  });
  const createReview = useMutation({
    mutationFn: async (values: ReviewFormValues) => {
      if (!token || !reviewBookingId) {
        throw new Error('Review target missing');
      }

      return apiClient.createReview(token, {
        bookingId: reviewBookingId,
        rating: values.rating,
        comment: values.comment || null,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setReviewBookingId(null);
      reviewForm.reset({
        rating: 5,
        comment: '',
      });
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to submit review');
    },
  });

  const handleCollectionSubmit = collectionForm.handleSubmit(async (values) => {
    setFeedback(null);
    await collectPayment.mutateAsync(values);
  });
  const handleReviewSubmit = reviewForm.handleSubmit(async (values) => {
    setFeedback(null);
    await createReview.mutateAsync(values);
  });

  return (
    <DashboardShell
      title="Client operations"
      subtitle="This surface is prepared for booking creation, escrow timeline views, delivery confirmations, and dispute escalation UX."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Escrow posture" value={bookings.data?.some((booking) => booking.escrow) ? 'Tracked' : 'Open'} detail="Client delivery checkpoints and confirmation states are now driven by live booking and escrow records." icon={<CircleDollarSign className="size-8" />} />
        <StatCard eyebrow="Risk posture" value="Guarded" detail="Trust and fraud scoring hooks are already present in the backend for future UI surfacing." icon={<ShieldAlert className="size-8" />} />
        <StatCard eyebrow="Response time" value={`${bookings.data?.length ?? 0}`} detail="This counter reflects live bookings accessible to the signed-in client account." icon={<TimerReset className="size-8" />} />
      </div>

      {feedback ? (
        <Card className="mt-6">
          <p className="text-sm text-[var(--text-primary)]">{feedback}</p>
        </Card>
      ) : null}
      {collectionGatewayPreview ? (
        <Card className="mt-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Latest collection payload</p>
          <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-xs text-[var(--text-secondary)]">
            {collectionGatewayPreview}
          </pre>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Service catalog</p>
          <div className="mt-5 grid gap-4">
            {services.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading services...</p> : null}
            {services.isError ? <p className="text-sm text-rose-300">{services.error instanceof Error ? services.error.message : 'Unable to load services'}</p> : null}
            {services.data?.map((service) => (
              <div key={service.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-display text-2xl text-[var(--text-primary)]">{service.title}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{service.description ?? 'No description supplied yet.'}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                      {service.category ?? 'General'} · {service.price_cents} minor units
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setFeedback(null);
                      createBooking.mutate(service.id);
                    }}
                    disabled={createBooking.isPending || createEscrow.isPending}
                  >
                    {createBooking.isPending ? 'Creating...' : 'Book service'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Bookings and escrow</p>
          <div className="mt-5 space-y-4">
            {bookings.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading bookings...</p> : null}
            {bookings.isError ? <p className="text-sm text-rose-300">{bookings.error instanceof Error ? bookings.error.message : 'Unable to load bookings'}</p> : null}
            {bookings.data?.length ? bookings.data.map((booking) => (
              <div key={booking.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl text-[var(--text-primary)]">{booking.service_title}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Booking status: {booking.status}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{booking.created_at}</p>
                  </div>
                  <div className="rounded-full border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--brand-secondary)]">
                    #{booking.id}
                  </div>
                </div>
                <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[var(--text-secondary)]">
                  {booking.escrow ? (
                    <>
                      <p><span className="text-[var(--text-primary)]">Escrow:</span> {booking.escrow.reference}</p>
                      <p><span className="text-[var(--text-primary)]">State:</span> {booking.escrow.status}</p>
                      <p><span className="text-[var(--text-primary)]">Amount:</span> {booking.escrow.amount_minor} {booking.escrow.currency}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {booking.escrow.status === 'CREATED' ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setActiveEscrowId(booking.escrow?.id ?? null);
                              setActiveBookingId(booking.id);
                              setFeedback(null);
                            }}
                          >
                            Collect payment
                          </Button>
                        ) : null}
                        {booking.escrow.status === 'ACTIVE' ? (
                          <>
                            <Button size="sm" onClick={() => releaseEscrow.mutate(booking.id)} disabled={releaseEscrow.isPending}>
                              {releaseEscrow.isPending ? 'Releasing...' : 'Release escrow'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => disputeEscrow.mutate(booking.id)} disabled={disputeEscrow.isPending}>
                              {disputeEscrow.isPending ? 'Opening dispute...' : 'Open dispute'}
                            </Button>
                          </>
                        ) : null}
                        {booking.status === 'completed' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReviewBookingId(booking.id);
                              setFeedback(null);
                            }}
                          >
                            Leave review
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p>No escrow linked yet. Create one to start protected payment collection.</p>
                      <Button size="sm" onClick={() => createEscrow.mutate(booking.id)} disabled={createEscrow.isPending}>
                        {createEscrow.isPending ? 'Creating escrow...' : 'Create escrow'}
                      </Button>
                    </div>
                  )}
                </div>
                {activeEscrowId === booking.escrow?.id && activeBookingId === booking.id ? (
                  <form className="mt-4 grid gap-4 rounded-[20px] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4" onSubmit={handleCollectionSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-[var(--text-secondary)]" htmlFor={`msisdn-${booking.id}`}>MSISDN</label>
                        <input id={`msisdn-${booking.id}`} placeholder="2557XXXXXXXX" {...collectionForm.register('msisdn')} />
                        {collectionForm.formState.errors.msisdn ? <p className="text-sm text-rose-300">{collectionForm.formState.errors.msisdn.message}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[var(--text-secondary)]" htmlFor={`provider-${booking.id}`}>Provider</label>
                        <select id={`provider-${booking.id}`} {...collectionForm.register('provider')}>
                          <option value="MPESA">M-Pesa</option>
                          <option value="AIRTEL">Airtel Money</option>
                          <option value="YAS">YAS</option>
                        </select>
                        {collectionForm.formState.errors.provider ? <p className="text-sm text-rose-300">{collectionForm.formState.errors.provider.message}</p> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" size="sm" disabled={collectPayment.isPending}>
                        {collectPayment.isPending ? 'Starting collection...' : 'Start collection'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveEscrowId(null);
                          setActiveBookingId(null);
                          collectionForm.reset({
                            msisdn: '',
                            provider: 'MPESA',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
                {reviewBookingId === booking.id ? (
                  <form className="mt-4 grid gap-4 rounded-[20px] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4" onSubmit={handleReviewSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-[var(--text-secondary)]" htmlFor={`review-rating-${booking.id}`}>Rating</label>
                        <select id={`review-rating-${booking.id}`} {...reviewForm.register('rating', { valueAsNumber: true })}>
                          <option value={5}>5</option>
                          <option value={4}>4</option>
                          <option value={3}>3</option>
                          <option value={2}>2</option>
                          <option value={1}>1</option>
                        </select>
                        {reviewForm.formState.errors.rating ? <p className="text-sm text-rose-300">{reviewForm.formState.errors.rating.message}</p> : null}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]" htmlFor={`review-comment-${booking.id}`}>Comment</label>
                      <textarea id={`review-comment-${booking.id}`} rows={4} placeholder="How was the delivery experience?" {...reviewForm.register('comment')} />
                      {reviewForm.formState.errors.comment ? <p className="text-sm text-rose-300">{reviewForm.formState.errors.comment.message}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" size="sm" disabled={createReview.isPending}>
                        {createReview.isPending ? 'Submitting review...' : 'Submit review'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReviewBookingId(null);
                          reviewForm.reset({
                            rating: 5,
                            comment: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            )) : null}
            {!bookings.isLoading && !bookings.data?.length ? (
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 text-sm text-[var(--text-secondary)]">
                No bookings yet. Create the first one from the service catalog.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
