import { appConfig } from '@/lib/config';
import type {
  AdminMetricsHealth,
  AdminMetricsTrendResponse,
  BookingCreateResponse,
  BookingRecord,
  CollectionGatewayResponse,
  DisputedEscrowRecord,
  EscrowActionResponse,
  AuthResponse,
  BackendHealth,
  MessageRecord,
  MessageSendInput,
  NotificationRecord,
  RefreshResponse,
  ReviewCreateInput,
  ReviewRecord,
  ServiceListItem,
  ServiceUpsertInput,
  WithdrawalRecord,
  WithdrawalRequestInput,
  WithdrawalSummary,
  VendorProfile,
  VendorProfileInput,
} from '@/lib/types';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export const apiClient = {
  getBackendStatus(): Promise<BackendHealth> {
    return request<BackendHealth>('/');
  },
  getHealth(): Promise<BackendHealth> {
    return request<BackendHealth>('/health');
  },
  getServices(token?: string | null): Promise<ServiceListItem[]> {
    return request<ServiceListItem[]>('/api/services', { token });
  },
  createService(token: string, input: ServiceUpsertInput): Promise<{ id: number; message: string }> {
    return request<{ id: number; message: string }>('/api/services', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  updateService(token: string, serviceId: number, input: ServiceUpsertInput): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/services/${serviceId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(input),
    });
  },
  deleteService(token: string, serviceId: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/services/${serviceId}`, {
      method: 'DELETE',
      token,
    });
  },
  getBookings(token: string): Promise<BookingRecord[]> {
    return request<BookingRecord[]>('/api/bookings', { token });
  },
  createBooking(token: string, serviceId: number): Promise<BookingCreateResponse> {
    return request<BookingCreateResponse>('/api/bookings', {
      method: 'POST',
      token,
      body: JSON.stringify({ service_id: serviceId }),
    });
  },
  createBookingEscrow(token: string, bookingId: number): Promise<EscrowActionResponse> {
    return request<EscrowActionResponse>(`/api/bookings/${bookingId}/escrow`, {
      method: 'POST',
      token,
    });
  },
  releaseBookingEscrow(token: string, bookingId: number): Promise<EscrowActionResponse> {
    return request<EscrowActionResponse>(`/api/bookings/${bookingId}/escrow/release`, {
      method: 'POST',
      token,
    });
  },
  disputeBookingEscrow(token: string, bookingId: number, reason: string): Promise<EscrowActionResponse> {
    return request<EscrowActionResponse>(`/api/bookings/${bookingId}/escrow/dispute`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason }),
    });
  },
  createCollection(token: string, escrowId: number, msisdn: string, provider: string): Promise<CollectionGatewayResponse> {
    return request<CollectionGatewayResponse>(`/api/payments/escrows/${escrowId}/collect`, {
      method: 'POST',
      token,
      body: JSON.stringify({ msisdn, provider }),
    });
  },
  login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  register(email: string, password: string, type: 'client' | 'vendor'): Promise<AuthResponse> {
    return request<AuthResponse>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, type }),
    });
  },
  refresh(refreshToken: string): Promise<RefreshResponse> {
    return request<RefreshResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },
  getVendorProfile(token: string): Promise<VendorProfile> {
    return request<VendorProfile>('/api/vendor/profile', { token });
  },
  createVendorProfile(token: string, input: VendorProfileInput): Promise<{ message: string; id: number }> {
    return request<{ message: string; id: number }>('/api/vendor/profile', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  updateVendorProfile(token: string, input: VendorProfileInput): Promise<{ message: string }> {
    return request<{ message: string }>('/api/vendor/profile', {
      method: 'PUT',
      token,
      body: JSON.stringify(input),
    });
  },
  getAdminMetricsHealth(token: string): Promise<AdminMetricsHealth> {
    return request<AdminMetricsHealth>('/api/admin/metrics/health', { token });
  },
  getAdminMetricsTrend(token: string, days = 30): Promise<AdminMetricsTrendResponse> {
    return request<AdminMetricsTrendResponse>(`/api/admin/metrics/trend?days=${days}`, { token });
  },
  getDisputedEscrows(token: string): Promise<DisputedEscrowRecord[]> {
    return request<DisputedEscrowRecord[]>('/api/admin/escrow/list', { token });
  },
  resolveEscrow(token: string, escrowId: number, releaseToVendor: boolean): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/admin/escrow/resolve/${escrowId}`, {
      method: 'POST',
      token,
      body: JSON.stringify({ release_to_vendor: releaseToVendor }),
    });
  },
  getVendorReviews(vendorId: number): Promise<ReviewRecord[]> {
    return request<ReviewRecord[]>(`/api/reviews/vendor/${vendorId}`);
  },
  createReview(token: string, input: ReviewCreateInput): Promise<{ message: string }> {
    return request<{ message: string }>('/api/reviews', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  getWithdrawalSummary(token: string, currency = 'TZS'): Promise<WithdrawalSummary> {
    return request<WithdrawalSummary>(`/api/withdrawals/summary?currency=${currency}`, { token });
  },
  getWithdrawals(token: string): Promise<WithdrawalRecord[]> {
    return request<WithdrawalRecord[]>('/api/withdrawals', { token });
  },
  requestWithdrawal(token: string, input: WithdrawalRequestInput): Promise<{ id: number; reference: string; status: string }> {
    return request<{ id: number; reference: string; status: string }>('/api/withdrawals', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  getNotifications(token: string): Promise<NotificationRecord[]> {
    return request<{ notifications: NotificationRecord[] }>('/api/notifications', { token }).then((response) => response.notifications);
  },
  markNotificationRead(token: string, notificationId: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/notifications/read/${notificationId}`, {
      method: 'POST',
      token,
    });
  },
  getMessages(token: string): Promise<MessageRecord[]> {
    return request<{ messages: MessageRecord[] }>('/api/messages/inbox', { token }).then((response) => response.messages);
  },
  sendMessage(token: string, input: MessageSendInput): Promise<{ message: string }> {
    return request<{ message: string }>('/api/messages', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
};
