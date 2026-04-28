import { appConfig } from '@/lib/config';
import type {
  AdminMetricsHealth,
  AdminOpsOverview,
  AdminMetricsTrendResponse,
  AdminVendorCapabilityListResponse,
  AdminVendorVerificationRecord,
  AdminVendorVerificationListResponse,
  AdminVendorVerificationReviewResponse,
  AdminVendorCapabilitySummary,
  AdminVendorCapabilityReviewInput,
  AdminVendorCapabilityReviewResponse,
  AdminAssignClientRequestInput,
  AdminAssignClientRequestResponse,
  AdminClientRequestInterestsResponse,
  AdminClientRequestListResponse,
  AdminEscrowActionResponse,
  AdminEscrowResolutionInput,
  AdminEscrowListResponse,
  AdminEscrowSummary,
  AdminDashboardSummary,
  AdminRiskOverview,
  AdminUserActionResponse,
  AdminUserInput,
  AdminUserListResponse,
  AdminUserRecord,
  AuthUser,
  ClientDashboardSummary,
  ClientRequestBookingResponse,
  ClientRequestCreateInput,
  ClientRequestCreateResponse,
  ClientRequestListResponse,
  ClientRequestRecord,
  VendorRequestFeedRecord,
  VendorRequestFeedListResponse,
  VendorRequestInterestInput,
  VendorRequestInterestResponse,
  BookingListResponse,
  BookingRecord,
  BookingSummary,
  CollectionGatewayResponse,
  DeliveryActionResponse,
  DeliveryDirectUploadPrepareResponse,
  DeliveryRecord,
  VendorResumeDirectUploadPrepareResponse,
  DashboardShellSummary,
  EscrowActionResponse,
  AuthResponse,
  BackendHealth,
  MessageRecord,
  MessageSendInput,
  ThreadSummaryListResponse,
  MessageUnreadSummary,
  NotificationListResponse,
  NotificationSummary,
  NotificationActionResponse,
  RefreshResponse,
  RegistrationResponse,
  ReviewCreateInput,
  ReviewRecord,
  ServiceGroupRecord,
  ServiceTypeRecord,
  SignedDownloadLinkResponse,
  WithdrawalActionResponse,
  WithdrawalListResponse,
  WithdrawalRequestInput,
  WithdrawalSummary,
  VendorDashboardSummary,
  VendorProfile,
  VendorProfileResponse,
  VendorProfileInput,
  VendorServiceCapabilityInput,
  VendorServiceCapabilityRecord,
  VendorServiceCapabilityResponse,
  VendorInterviewAnswerInput,
  VendorInterviewGenerateResponse,
  VendorInterviewSubmitResponse,
  VendorTrustSummary,
  VerificationResponse,
} from '@/lib/types';

interface RequestOptions extends RequestInit {
  token?: string | null;
  skipAuthRefresh?: boolean;
  acceptStatuses?: number[];
}

interface ClientRequestListOptions {
  page?: number;
  limit?: number;
  view?: 'all' | 'active' | 'awaiting_payment' | 'completed';
}

interface VendorRequestFeedOptions {
  page?: number;
  limit?: number;
  search?: string;
  view?: 'all' | 'needs_proposal' | 'sent';
}

interface AdminClientRequestListOptions {
  page?: number;
  limit?: number;
  search?: string;
  view?: 'all' | 'needs_review' | 'awaiting_payment';
}

interface AdminUserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  view?: 'all' | 'client' | 'vendor' | 'admin' | 'locked' | 'unverified';
}

interface AdminVendorCapabilityListOptions {
  page?: number;
  limit?: number;
  search?: string;
  view?: 'all' | 'pending' | 'approved' | 'returned';
}

interface AdminEscrowListOptions {
  page?: number;
  limit?: number;
  search?: string;
}

interface ThreadSummaryListOptions {
  page?: number;
  limit?: number;
  search?: string;
  view?: 'all' | 'request' | 'booking' | 'unread';
}

interface BookingListOptions {
  page?: number;
  limit?: number;
  view?: 'all' | 'active' | 'protected' | 'unread';
  search?: string;
}

interface NotificationListOptions {
  page?: number;
  limit?: number;
  search?: string;
  view?: 'all' | 'unread';
  category?: 'all' | 'finance' | 'escrow' | 'message' | 'risk' | 'platform';
}

interface WithdrawalListOptions {
  page?: number;
  limit?: number;
  search?: string;
  view?: 'all' | 'pending' | 'processing' | 'paid' | 'failed';
}

let refreshPromise: Promise<boolean> | null = null;

async function syncAuthStoreUser(user: AuthUser | null) {
  const { useAuthStore } = await import('@/lib/auth/store');

  useAuthStore.setState((state) => ({
    ...state,
    token: user ? 'cookie-session' : null,
    refreshToken: null,
    expiresIn: null,
    user,
    hydrated: true,
  }));
}

async function refreshAccessSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await request<RefreshResponse>('/api/auth/refresh', {
        method: 'POST',
        skipAuthRefresh: true,
      });
      if (response.user) {
        await syncAuthStoreUser(response.user);
      }
      return true;
    } catch {
      await syncAuthStoreUser(null);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const requestId = response.headers.get('x-request-id');
  const data = await response.json().catch(() => null);

  if (response.status === 401 && !options.skipAuthRefresh) {
    const refreshed = await refreshAccessSession();

    if (refreshed) {
      return request<T>(path, {
        ...options,
        skipAuthRefresh: true,
      });
    }
  }

  if (!response.ok && !(options.acceptStatuses ?? []).includes(response.status)) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
        : `Request failed with status ${response.status}`;

    const resolvedRequestId =
      data && typeof data === 'object' && 'request_id' in data && typeof data.request_id === 'string'
        ? data.request_id
        : requestId;

    throw new Error(resolvedRequestId ? `${message} (Request ID: ${resolvedRequestId})` : message);
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
  getServiceTypes(
    token?: string | null,
    options: {
      includeInactive?: boolean;
      search?: string;
      group?: string;
      category?: string;
    } = {},
  ): Promise<ServiceTypeRecord[]> {
    const params = new URLSearchParams();
    if (options.includeInactive) {
      params.set('include_inactive', '1');
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.group) {
      params.set('group', options.group);
    }
    if (options.category) {
      params.set('category', options.category);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<ServiceTypeRecord[]>(`/api/service-types${suffix}`, { token });
  },
  getServiceGroups(token?: string | null): Promise<ServiceGroupRecord[]> {
    return request<ServiceGroupRecord[]>('/api/service-types/groups', { token });
  },
  getServiceType(serviceTypeId: number, token?: string | null): Promise<ServiceTypeRecord> {
    return request<ServiceTypeRecord>(`/api/service-types/${serviceTypeId}`, { token });
  },
  getBookings(token: string, options: BookingListOptions = {}): Promise<BookingListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.view) {
      params.set('view', options.view);
    }
    if (options.search) {
      params.set('search', options.search);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<BookingListResponse>(`/api/bookings${suffix}`, { token });
  },
  getBookingSummary(token: string): Promise<BookingSummary> {
    return request<BookingSummary>('/api/bookings/summary', { token });
  },
  getBooking(token: string, bookingId: number): Promise<BookingRecord> {
    return request<BookingRecord>(`/api/bookings/${bookingId}`, { token });
  },
  getBookingDeliveries(token: string, bookingId: number): Promise<DeliveryRecord[]> {
    return request<{ deliveries: DeliveryRecord[] }>(`/api/bookings/${bookingId}/deliveries`, { token }).then((response) => response.deliveries);
  },
  getClientRequests(token: string, options: ClientRequestListOptions = {}): Promise<ClientRequestListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.view) {
      params.set('view', options.view);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<ClientRequestListResponse>(`/api/client-requests${suffix}`, { token });
  },
  getClientRequest(token: string, requestId: number): Promise<ClientRequestRecord> {
    return request<ClientRequestRecord>(`/api/client-requests/${requestId}`, { token });
  },
  createClientRequest(token: string, input: ClientRequestCreateInput): Promise<ClientRequestCreateResponse> {
    return request<ClientRequestCreateResponse>('/api/client-requests', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  openClientRequestBooking(token: string, requestId: number): Promise<ClientRequestBookingResponse> {
    return request<ClientRequestBookingResponse>(`/api/client-requests/${requestId}/booking`, {
      method: 'POST',
      token,
    });
  },
  getVendorRequestFeed(token: string, options: VendorRequestFeedOptions = {}): Promise<VendorRequestFeedListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.view) {
      params.set('view', options.view);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<VendorRequestFeedListResponse>(`/api/vendor/request-feed${suffix}`, { token });
  },
  getVendorRequestDetail(token: string, requestId: number): Promise<VendorRequestFeedRecord> {
    return request<VendorRequestFeedRecord>(`/api/vendor/request-feed/${requestId}`, { token });
  },
  submitVendorRequestInterest(
    token: string,
    requestId: number,
    input: VendorRequestInterestInput,
  ): Promise<VendorRequestInterestResponse> {
    return request<VendorRequestInterestResponse>(`/api/client-requests/${requestId}/interest`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
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
  submitBookingDelivery(
    token: string,
    bookingId: number,
    input: {
      delivery_note: string;
      delivery_link?: string | null;
      stored_attachments?: Array<{
        file_name: string;
        storage_path: string;
        mime_type: string;
        upload_token: string;
        expires: number;
      }>;
    },
    files: File[] = [],
  ): Promise<DeliveryActionResponse> {
    if (files.length === 0) {
      return request<DeliveryActionResponse>(`/api/bookings/${bookingId}/deliveries`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      });
    }

    const formData = new FormData();
    formData.append('delivery_note', input.delivery_note);
    if (input.delivery_link && input.delivery_link.trim() !== '') {
      formData.append('delivery_link', input.delivery_link.trim());
    }
    files.forEach((file) => formData.append('files[]', file));

    return request<DeliveryActionResponse>(`/api/bookings/${bookingId}/deliveries`, {
      method: 'POST',
      token,
      body: formData,
    });
  },
  prepareBookingDeliveryDirectUpload(
    token: string,
    bookingId: number,
    input: { files: Array<{ file_name: string; mime_type: string }> },
  ): Promise<DeliveryDirectUploadPrepareResponse> {
    return request<DeliveryDirectUploadPrepareResponse>(`/api/bookings/${bookingId}/deliveries/direct-upload/prepare`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  deleteBookingDelivery(token: string, bookingId: number, deliveryId: number): Promise<DeliveryActionResponse> {
    return request<DeliveryActionResponse>(`/api/bookings/${bookingId}/deliveries/${deliveryId}`, {
      method: 'DELETE',
      token,
    });
  },
  deleteBookingDeliveryAttachment(token: string, bookingId: number, deliveryId: number, attachmentId: number): Promise<DeliveryActionResponse> {
    return request<DeliveryActionResponse>(`/api/bookings/${bookingId}/deliveries/${deliveryId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      token,
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
  logout(): Promise<{ message: string }> {
    return request<{ message: string }>('/api/logout', {
      method: 'POST',
      skipAuthRefresh: true,
    });
  },
  getCurrentUser(): Promise<AuthUser> {
    return request<AuthUser>('/api/protected/me');
  },
  register(email: string, password: string, type: 'client' | 'vendor'): Promise<RegistrationResponse> {
    return request<RegistrationResponse>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, type }),
    });
  },
  refresh(): Promise<RefreshResponse> {
    return request<RefreshResponse>('/api/auth/refresh', {
      method: 'POST',
      skipAuthRefresh: true,
    });
  },
  resendVerification(email: string): Promise<VerificationResponse> {
    return request<VerificationResponse>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  verifyEmail(token: string, expires: string, signature: string): Promise<VerificationResponse> {
    const params = new URLSearchParams({
      token,
      expires,
      signature,
    });

    return request<VerificationResponse>(`/api/auth/verify-email?${params.toString()}`, {
      method: 'GET',
    });
  },
  getVendorProfile(token: string): Promise<VendorProfile> {
    return request<VendorProfile>('/api/vendor/profile', { token });
  },
  getVendorDashboardSummary(token: string): Promise<VendorDashboardSummary> {
    return request<VendorDashboardSummary>('/api/vendor/profile/dashboard-summary', { token });
  },
  getClientDashboardSummary(token: string): Promise<ClientDashboardSummary> {
    return request<ClientDashboardSummary>('/api/client/dashboard-summary', { token });
  },
  getVendorServiceCapabilities(token: string): Promise<VendorServiceCapabilityRecord[]> {
    return request<{ capabilities: VendorServiceCapabilityRecord[] }>('/api/vendor/service-capabilities', { token }).then((response) => response.capabilities);
  },
  updateVendorServiceCapabilities(token: string, capabilities: VendorServiceCapabilityInput[]): Promise<VendorServiceCapabilityResponse> {
    return request<VendorServiceCapabilityResponse>('/api/vendor/service-capabilities', {
      method: 'PUT',
      token,
      body: JSON.stringify({ capabilities }),
    });
  },
  getVendorTrust(token: string): Promise<VendorTrustSummary> {
    return request<VendorTrustSummary>('/api/vendor/trust', { token });
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
  uploadVendorResume(token: string, file: File): Promise<VendorProfileResponse> {
    const formData = new FormData();
    formData.append('resume', file);

    return request<VendorProfileResponse>('/api/vendor/profile/resume', {
      method: 'POST',
      token,
      body: formData,
    });
  },
  prepareVendorResumeDirectUpload(
    token: string,
    input: { file_name: string; mime_type: string },
  ): Promise<VendorResumeDirectUploadPrepareResponse> {
    return request<VendorResumeDirectUploadPrepareResponse>('/api/vendor/profile/resume/direct-upload/prepare', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  finalizeVendorResumeDirectUpload(
    token: string,
    input: { file_name: string; mime_type: string; storage_path: string; upload_token: string; expires: number },
  ): Promise<VendorProfileResponse> {
    return request<VendorProfileResponse>('/api/vendor/profile/resume/direct-upload/finalize', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  generateVendorInterview(token: string): Promise<VendorInterviewGenerateResponse> {
    return request<VendorInterviewGenerateResponse>('/api/vendor/profile/interview/generate', {
      method: 'POST',
      token,
    });
  },
  submitVendorInterview(token: string, answers: VendorInterviewAnswerInput[]): Promise<VendorInterviewSubmitResponse> {
    return request<VendorInterviewSubmitResponse>('/api/vendor/profile/interview/submit', {
      method: 'POST',
      token,
      body: JSON.stringify({ answers }),
    });
  },
  getVendorResumeDownloadLink(token: string): Promise<SignedDownloadLinkResponse> {
    return request<SignedDownloadLinkResponse>('/api/vendor/profile/resume/link', { token });
  },
  getAdminMetricsHealth(token: string): Promise<AdminMetricsHealth> {
    return request<AdminMetricsHealth>('/api/admin/metrics/health', {
      token,
      acceptStatuses: [503],
    });
  },
  getAdminMetricsTrend(token: string, days = 30): Promise<AdminMetricsTrendResponse> {
    return request<AdminMetricsTrendResponse>(`/api/admin/metrics/trend?days=${days}`, { token });
  },
  getAdminOpsOverview(token: string): Promise<AdminOpsOverview> {
    return request<AdminOpsOverview>('/api/admin/metrics/ops-overview', { token });
  },
  getDisputedEscrows(token: string, options: AdminEscrowListOptions = {}): Promise<AdminEscrowListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<AdminEscrowListResponse>(`/api/admin/escrow/list${suffix}`, { token });
  },
  getAdminEscrowSummary(token: string): Promise<AdminEscrowSummary> {
    return request<AdminEscrowSummary>('/api/admin/escrow/summary', { token });
  },
  getAdminDashboardSummary(token: string): Promise<AdminDashboardSummary> {
    return request<AdminDashboardSummary>('/api/admin/dashboard-summary', { token });
  },
  getAdminUsers(token: string, options: AdminUserListOptions = {}): Promise<AdminUserListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.view) {
      params.set('view', options.view);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<AdminUserListResponse>(`/api/admin/users${suffix}`, { token });
  },
  getAdminVendorCapabilities(token: string, options: AdminVendorCapabilityListOptions = {}): Promise<AdminVendorCapabilityListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.view) {
      params.set('view', options.view);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<AdminVendorCapabilityListResponse>(`/api/admin/vendor-capabilities${suffix}`, { token });
  },
  getAdminVendorCapabilitySummary(token: string, search?: string): Promise<AdminVendorCapabilitySummary> {
    const params = new URLSearchParams();
    if (search && search.trim() !== '') {
      params.set('search', search.trim());
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<AdminVendorCapabilitySummary>(`/api/admin/vendor-capabilities/summary${suffix}`, { token });
  },
  getAdminVendorCapability(token: string, capabilityId: number): Promise<VendorServiceCapabilityRecord> {
    return request<VendorServiceCapabilityRecord>(`/api/admin/vendor-capabilities/${capabilityId}`, { token });
  },
  reviewAdminVendorCapability(token: string, capabilityId: number, input: AdminVendorCapabilityReviewInput): Promise<AdminVendorCapabilityReviewResponse> {
    return request<AdminVendorCapabilityReviewResponse>(`/api/admin/vendor-capabilities/${capabilityId}/review`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  getAdminUser(token: string, userId: number): Promise<AdminUserRecord> {
    return request<AdminUserRecord>(`/api/admin/users/${userId}`, { token });
  },
  createAdminUser(token: string, input: AdminUserInput): Promise<AdminUserActionResponse> {
    return request<AdminUserActionResponse>('/api/admin/users', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  updateAdminUser(token: string, userId: number, input: AdminUserInput): Promise<AdminUserActionResponse> {
    return request<AdminUserActionResponse>(`/api/admin/users/${userId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(input),
    });
  },
  deleteAdminUser(token: string, userId: number): Promise<AdminUserActionResponse> {
    return request<AdminUserActionResponse>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      token,
    });
  },
  getAdminVendorVerifications(
    token: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      view?: 'all' | 'ready_review' | 'badge_active' | 'needs_revision' | 'missing_resume';
    } = {},
  ): Promise<AdminVendorVerificationListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.view) {
      params.set('view', options.view);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<AdminVendorVerificationListResponse>(`/api/admin/vendor-verifications${suffix}`, { token });
  },
  getAdminVendorVerification(token: string, profileId: number): Promise<AdminVendorVerificationRecord> {
    return request<AdminVendorVerificationRecord>(`/api/admin/vendor-verifications/${profileId}`, { token });
  },
  getAdminVendorVerificationResumeLink(token: string, profileId: number): Promise<SignedDownloadLinkResponse> {
    return request<SignedDownloadLinkResponse>(`/api/admin/vendor-verifications/${profileId}/resume-link`, { token });
  },
  reviewAdminVendorVerification(
    token: string,
    profileId: number,
    input: { decision: 'approve' | 'revoke'; review_note?: string | null },
  ): Promise<AdminVendorVerificationReviewResponse> {
    return request<AdminVendorVerificationReviewResponse>(`/api/admin/vendor-verifications/${profileId}/review`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  getAdminClientRequests(token: string, options: AdminClientRequestListOptions = {}): Promise<AdminClientRequestListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.view) {
      params.set('view', options.view);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<AdminClientRequestListResponse>(`/api/admin/client-requests${suffix}`, { token });
  },
  getAdminClientRequestInterests(token: string, requestId: number): Promise<AdminClientRequestInterestsResponse> {
    return request<AdminClientRequestInterestsResponse>(`/api/admin/client-requests/${requestId}/interests`, { token });
  },
  assignAdminClientRequest(
    token: string,
    requestId: number,
    input: AdminAssignClientRequestInput,
  ): Promise<AdminAssignClientRequestResponse> {
    return request<AdminAssignClientRequestResponse>(`/api/admin/client-requests/${requestId}/assign`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  lockAdminUser(token: string, userId: number): Promise<AdminUserActionResponse> {
    return request<AdminUserActionResponse>(`/api/admin/users/${userId}/lock`, {
      method: 'POST',
      token,
    });
  },
  unlockAdminUser(token: string, userId: number): Promise<AdminUserActionResponse> {
    return request<AdminUserActionResponse>(`/api/admin/users/${userId}/unlock`, {
      method: 'POST',
      token,
    });
  },
  getAdminRiskOverview(token: string): Promise<AdminRiskOverview> {
    return request<AdminRiskOverview>('/api/admin/risk/overview', { token });
  },
  resolveEscrow(token: string, escrowId: number, input: AdminEscrowResolutionInput): Promise<AdminEscrowActionResponse> {
    return request<AdminEscrowActionResponse>(`/api/admin/escrow/resolve/${escrowId}`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
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
  getWithdrawals(token: string, options: WithdrawalListOptions = {}): Promise<WithdrawalListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.view) {
      params.set('view', options.view);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<WithdrawalListResponse>(`/api/withdrawals${suffix}`, { token });
  },
  requestWithdrawal(token: string, input: WithdrawalRequestInput): Promise<WithdrawalActionResponse> {
    return request<WithdrawalActionResponse>('/api/withdrawals', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  getNotifications(token: string, options: NotificationListOptions = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.view) {
      params.set('view', options.view);
    }
    if (options.category) {
      params.set('category', options.category);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<NotificationListResponse>(`/api/notifications${suffix}`, { token });
  },
  getNotificationSummary(token: string): Promise<NotificationSummary> {
    return request<NotificationSummary>('/api/notifications/summary', { token });
  },
  getDashboardShellSummary(token: string): Promise<DashboardShellSummary> {
    return request<DashboardShellSummary>('/api/dashboard/shell-summary', { token });
  },
  markNotificationRead(token: string, notificationId: number): Promise<NotificationActionResponse> {
    return request<NotificationActionResponse>(`/api/notifications/read/${notificationId}`, {
      method: 'POST',
      token,
    });
  },
  getRequestThread(token: string, requestId: number): Promise<MessageRecord[]> {
    return request<{ messages: MessageRecord[] }>(`/api/messages/client-requests/${requestId}`, { token }).then((response) => response.messages);
  },
  getMessageUnreadSummary(token: string): Promise<MessageUnreadSummary> {
    return request<MessageUnreadSummary>('/api/messages/unread-summary', { token });
  },
  getThreadSummaries(token: string, options: ThreadSummaryListOptions = {}): Promise<ThreadSummaryListResponse> {
    const params = new URLSearchParams();
    if (typeof options.page === 'number') {
      params.set('page', String(options.page));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options.search) {
      params.set('search', options.search);
    }
    if (options.view) {
      params.set('view', options.view);
    }

    const suffix = params.size ? `?${params.toString()}` : '';
    return request<ThreadSummaryListResponse>(`/api/messages/thread-summaries${suffix}`, { token });
  },
  sendRequestThreadMessage(token: string, requestId: number, input: MessageSendInput): Promise<{ message: string; data: MessageRecord }> {
    return request<{ message: string; data: MessageRecord }>(`/api/messages/client-requests/${requestId}`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
  getBookingThread(token: string, bookingId: number): Promise<MessageRecord[]> {
    return request<{ messages: MessageRecord[] }>(`/api/messages/bookings/${bookingId}`, { token }).then((response) => response.messages);
  },
  sendBookingThreadMessage(token: string, bookingId: number, input: MessageSendInput): Promise<{ message: string; data: MessageRecord }> {
    return request<{ message: string; data: MessageRecord }>(`/api/messages/bookings/${bookingId}`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },
};
