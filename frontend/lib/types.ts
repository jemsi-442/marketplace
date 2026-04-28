export type AppRole = 'ROLE_ADMIN' | 'ROLE_SUPER_ADMIN' | 'ROLE_VENDOR' | 'ROLE_USER' | 'ROLE_CLIENT';

export interface AuthUser {
  id: number | null;
  email: string;
  roles: AppRole[];
  is_verified: boolean;
}

export interface AuthResponse {
  expires_in: number;
  user: AuthUser;
}

export interface RegistrationResponse {
  user: AuthUser;
  message?: string;
  verification_required?: boolean;
  verification_email_sent?: boolean;
  verification_url?: string;
}

export interface VerificationResponse {
  message: string;
  verified?: boolean;
  verification_url?: string;
}

export interface SignedDownloadLinkResponse {
  url: string;
  expires: number;
  signature: string;
  expires_at: string;
}

export interface DirectUploadDescriptor {
  url: string;
  method: string;
  headers: Record<string, string>;
  expires: number;
  expires_at: string;
}

export interface DirectUploadFinalizeDescriptor {
  url: string;
  expires: number;
  expires_at: string;
  token: string;
}

export interface VendorResumeDirectUploadPrepareResponse {
  message: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  upload: DirectUploadDescriptor;
  finalize: DirectUploadFinalizeDescriptor;
}

export interface DeliveryDirectUploadPreparedFile {
  file_name: string;
  mime_type: string;
  storage_path: string;
  upload: DirectUploadDescriptor;
  finalize: DirectUploadFinalizeDescriptor;
}

export interface DeliveryDirectUploadPrepareResponse {
  message: string;
  files: DeliveryDirectUploadPreparedFile[];
}

export interface RefreshResponse {
  expires_in: number;
  user?: AuthUser;
}

export interface BackendHealth {
  status: string;
  service?: string;
  name?: string;
  message?: string;
}

export interface VendorProfile {
  exists: boolean;
  id?: number;
  company_name?: string | null;
  bio?: string | null;
  website?: string | null;
  portfolio_link?: string | null;
  professional_headline?: string | null;
  resume_highlights?: string | null;
  resume_uploaded?: boolean;
  resume_file_name?: string | null;
  resume_mime_type?: string | null;
  resume_uploaded_at?: string | null;
  verification_status?: string | null;
  verification_badge_granted?: boolean;
  verification_badge_granted_at?: string | null;
  verification_review_note?: string | null;
  interview_score?: number | null;
  interview_submitted_at?: string | null;
  interview_questions?: VendorInterviewQuestion[];
  interview_attempt_history?: Array<{
    submitted_at: string;
    score: number;
    passed: boolean;
    note?: string | null;
    badge_granted?: boolean;
  }>;
  user_id?: number;
  message?: string;
}

export interface VendorDashboardSummary {
  active_capabilities: number;
  approved_capabilities: number;
  pending_capabilities: number;
  returned_capabilities: number;
  open_requests: number;
  active_bookings: number;
  protected_bookings: number;
  available_balance_minor: number;
  currency: string;
  verification_status?: string | null;
  verification_badge_granted?: boolean;
  resume_uploaded?: boolean;
  interview_score?: number | null;
}

export interface ClientDashboardSummary {
  visible_lane_count: number;
  active_requests: number;
  awaiting_payment_requests: number;
  tracked_bookings: number;
  active_bookings: number;
  protected_bookings: number;
  disputed_bookings: number;
  protected_value_minor: number;
  currency: string;
  recent_bookings: BookingRecord[];
}

export interface AdminMetricsHealth {
  status: string;
  is_healthy: boolean;
  is_stale: boolean;
  stale_threshold_hours: number;
  message: string;
  last_snapshot_date?: string;
  snapshot_age_hours?: number;
}

export interface AdminOpsOverview {
  status: 'HEALTHY' | 'ATTENTION';
  checked_at: string;
  app_env: string;
  request_tracing: {
    enabled: boolean;
  };
  object_storage: {
    status: 'READY' | 'UNSUPPORTED';
    driver: string;
    message: string;
  };
  metrics_pipeline: AdminMetricsHealth;
  upload_scanning: {
    status: 'READY' | 'DISABLED' | 'DEGRADED';
    enabled: boolean;
    binary: string;
    binary_available: boolean;
    timeout_seconds: number;
    fail_closed: boolean;
    message: string;
  };
}

export interface AdminDashboardSummary {
  open_requests: number;
  pending_capabilities: number;
  active_bookings: number;
  disputes: number;
}

export interface AdminMetricsTrendSummary {
  total_volume_minor: number;
  total_fees_collected_minor: number;
  avg_high_risk_escrow_percentage: number;
}

export interface AdminMetricsTrendPoint {
  snapshotDate?: string;
  totalVolumeMinor?: number;
  totalFeesCollectedMinor?: number;
  highRiskEscrowPercentage?: number;
  avgTrustScore?: number;
  [key: string]: unknown;
}

export interface AdminMetricsTrendResponse {
  window_days: number;
  points: number;
  summary: AdminMetricsTrendSummary;
  trend: AdminMetricsTrendPoint[];
}

export interface VendorProfileInput {
  companyName: string;
  bio?: string | null;
  website?: string | null;
  portfolioLink?: string | null;
  professionalHeadline?: string | null;
  resumeHighlights?: string | null;
}

export interface VendorInterviewQuestion {
  id: string;
  title: string;
  prompt: string;
  keywords?: string[];
  practical_signals?: string[];
}

export interface VendorInterviewAnswerInput {
  question_id: string;
  answer: string;
}

export interface VendorProfileResponse {
  message: string;
  profile: VendorProfile;
}

export interface VendorInterviewGenerateResponse extends VendorProfileResponse {
  questions: VendorInterviewQuestion[];
}

export interface VendorInterviewSubmitResponse extends VendorProfileResponse {
  score: number;
  passed: boolean;
  feedback_summary?: {
    strong_answers: number;
    weak_answers: number;
    generic_flags: number;
    timeline_strength: number;
    strong_signals: string[];
    missing_signals: string[];
    strength_summary: string;
    gap_summary: string;
  };
}

export interface AdminVendorVerificationRecord {
  id: number;
  vendor: {
    user_id: number;
    email: string;
    company_name?: string | null;
  };
  professional_headline?: string | null;
  resume_highlights?: string | null;
  resume_uploaded: boolean;
  resume_file_name?: string | null;
  resume_uploaded_at?: string | null;
  verification_status: string;
  verification_badge_granted: boolean;
  verification_badge_granted_at?: string | null;
  verification_review_note?: string | null;
  interview_score?: number | null;
  interview_submitted_at?: string | null;
  interview_questions: VendorInterviewQuestion[];
  interview_attempt_history?: Array<{
    submitted_at: string;
    score: number;
    passed: boolean;
    note?: string | null;
    badge_granted?: boolean;
  }>;
  interview_answers: Array<{
    question_id: string;
    answer: string;
    word_count?: number;
    keyword_hits?: number;
    practical_signal_hits?: number;
    lane_practical_signal_hits?: number;
    timeline_signal_hits?: number;
    number_signals?: number;
    generic_phrase_hits?: number;
    score?: number;
  }>;
}

export interface AdminVendorVerificationListResponse {
  items: AdminVendorVerificationRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    ready_review: number;
    badge_active: number;
    needs_revision: number;
    missing_resume: number;
  };
}

export interface AdminVendorVerificationReviewResponse {
  message: string;
  profile: AdminVendorVerificationRecord;
}

export interface ServiceTypeRecord {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  group_slug?: string | null;
  group_title?: string | null;
  is_active: boolean;
  requires_admin_assignment: boolean;
  default_brief_template?: string | null;
}

export interface ServiceGroupRecord {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  hero_title: string;
  hero_description: string;
  search_placeholder: string;
  category_labels: string[];
  featured_services: string[];
  service_count: number;
}

export interface ClientRequestRecord {
  id: number;
  service_type: {
    id: number;
    name: string;
    slug: string;
    category?: string | null;
    group_slug?: string | null;
    group_title?: string | null;
    requires_admin_assignment: boolean;
  };
  request_summary: string;
  scope_details?: string | null;
  deadline_note?: string | null;
  budget_note?: string | null;
  attachments_count?: number | null;
  assignment_managed_by_platform: boolean;
  vendor_identity_hidden_from_client: boolean;
  agreed_price_minor?: number | null;
  currency?: string | null;
  agreed_timeline_note?: string | null;
  admin_assignment_note?: string | null;
  status: string;
  submitted_at?: string | null;
  matched_at?: string | null;
  assigned_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  unread_thread_count?: number;
}

export interface ClientRequestListResponse {
  items: ClientRequestRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    active: number;
    awaiting_payment: number;
    completed: number;
  };
}

export interface ClientRequestCreateInput {
  service_type_id: number;
  request_summary: string;
  scope_details?: string | null;
  deadline_note?: string | null;
  budget_note?: string | null;
  attachments_count?: number | null;
}

export interface ClientRequestCreateResponse {
  message: string;
  request: ClientRequestRecord;
}

export interface ClientRequestBookingResponse {
  message: string;
  booking: {
    id: number;
    status: string;
    request_summary: string;
    amount_minor: number | null;
    currency: string;
  };
}

export interface VendorRequestFeedRecord {
  id: number;
  service_type: {
    id: number;
    name: string;
    slug: string;
    category?: string | null;
    group_slug?: string | null;
    group_title?: string | null;
  };
  request_summary: string;
  scope_details?: string | null;
  deadline_note?: string | null;
  budget_note?: string | null;
  status: string;
  submitted_at?: string | null;
  matched_at?: string | null;
  unread_thread_count?: number;
  capability: {
    id: number;
    experience_level?: string | null;
    starting_price_minor?: number | null;
    capacity_status?: string | null;
    turnaround_note?: string | null;
  };
  interest?: {
    id: number;
    status: string;
    submitted_at: string;
  } | null;
}

export interface VendorRequestFeedListResponse {
  items: VendorRequestFeedRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    needs_proposal: number;
    sent: number;
  };
}

export interface VendorServiceCapabilityRecord {
  id: number;
  vendor?: {
    id: number;
    user_id?: number | null;
    email?: string;
    company_name?: string | null;
  };
  service_type: {
    id: number;
    name: string;
    slug: string;
    category?: string | null;
    group_slug?: string | null;
    group_title?: string | null;
  };
  is_active: boolean;
  experience_level: string;
  starting_price_minor?: number | null;
  portfolio_summary?: string | null;
  capacity_status: 'available' | 'limited' | 'unavailable' | string;
  turnaround_note?: string | null;
  approved_by_admin: boolean;
  review_state?: 'pending' | 'approved' | 'returned' | string;
  admin_review_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by_admin?: {
    id: number | null;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface VendorServiceCapabilityInput {
  service_type_id: number;
  is_active: boolean;
  experience_level: string;
  starting_price_minor?: number | null;
  portfolio_summary?: string | null;
  capacity_status: 'available' | 'limited' | 'unavailable' | string;
  turnaround_note?: string | null;
}

export interface VendorServiceCapabilityResponse {
  message: string;
  capabilities: VendorServiceCapabilityRecord[];
}

export interface AdminVendorCapabilityListResponse {
  items: VendorServiceCapabilityRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    pending: number;
    approved: number;
    returned: number;
  };
}

export interface AdminVendorCapabilitySummary {
  total: number;
  pending: number;
  approved: number;
  returned: number;
}

export interface AdminVendorCapabilityReviewInput {
  decision: 'approve' | 'return';
  review_note?: string | null;
}

export interface AdminVendorCapabilityReviewResponse {
  message: string;
  capability: VendorServiceCapabilityRecord;
}

export interface VendorRequestInterestInput {
  proposed_price_minor: number;
  price_reason: string;
  timeline_note: string;
  message?: string | null;
}

export interface VendorRequestInterestResponse {
  message: string;
  interest: {
    id: number;
    request_id: number;
    status: string;
    submitted_at: string;
  };
}

export interface AdminClientRequestRecord {
  id: number;
  client: {
    id: number;
    email: string;
  };
  service_type: {
    id: number;
    name: string;
    slug: string;
    category?: string | null;
    group_slug?: string | null;
    group_title?: string | null;
  };
  request_summary: string;
  scope_details?: string | null;
  deadline_note?: string | null;
  budget_note?: string | null;
  attachments_count?: number | null;
  selected_vendor?: {
    id: number | null;
    company_name?: string | null;
    user_id?: number | null;
  } | null;
  assigned_by_admin_id?: number | null;
  agreed_price_minor?: number | null;
  currency?: string | null;
  agreed_timeline_note?: string | null;
  admin_assignment_note?: string | null;
  status: string;
  submitted_at?: string | null;
  matched_at?: string | null;
  assigned_at?: string | null;
  created_at: string;
}

export interface AdminClientRequestListResponse {
  items: AdminClientRequestRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    open: number;
    needs_review: number;
    awaiting_payment: number;
  };
}

export interface AdminVendorInterestRecord {
  id: number;
  vendor: {
    id: number;
    company_name?: string | null;
    user_id: number;
    email: string;
  };
  message?: string | null;
  proposed_price_minor?: number | null;
  price_reason?: string | null;
  timeline_note?: string | null;
  status: string;
  submitted_at: string;
  reviewed_at?: string | null;
}

export interface AdminClientRequestInterestsResponse {
  request: AdminClientRequestRecord;
  interests: AdminVendorInterestRecord[];
}

export interface AdminAssignClientRequestInput {
  vendor_interest_id: number;
  agreed_price_minor: number;
  currency?: string;
  agreed_timeline_note: string;
  admin_assignment_note?: string | null;
}

export interface AdminAssignClientRequestResponse {
  message: string;
  request: AdminClientRequestRecord;
}

export interface BookingEscrowSummary {
  id: number | null;
  reference: string;
  status: string;
  amount_minor: number;
  currency: string;
  disputed_at?: string | null;
  resolved_at?: string | null;
  dispute_reason?: string | null;
  dispute_source?: string | null;
  resolution?: string | null;
  resolution_note?: string | null;
  evidence_summary?: string | null;
  tags?: string[];
}

export interface BookingRecord {
  id: number;
  service_title: string;
  service_category?: string | null;
  service_price_cents?: number;
  request_summary: string;
  scope_details?: string | null;
  deadline_note?: string | null;
  vendor_user_id: number;
  client_id: number;
  status: string;
  created_at: string;
  escrow: BookingEscrowSummary | null;
  unread_thread_count?: number;
}

export interface BookingSummary {
  total: number;
  active: number;
  protected: number;
  unread: number;
}

export interface BookingListResponse {
  items: BookingRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: BookingSummary;
}

export interface BookingListOptions {
  page?: number;
  limit?: number;
  view?: 'all' | 'active' | 'protected' | 'unread';
  search?: string;
}

export interface DeliveryAttachmentRecord {
  id: number;
  file_name: string;
  file_url: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
}

export interface DeliveryRecord {
  id: number;
  booking_id: number;
  status: string;
  delivery_note: string;
  delivery_link?: string | null;
  attachments: DeliveryAttachmentRecord[];
  review_note?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  vendor_user_id?: number | null;
}

export interface DeliveryActionResponse {
  message: string;
  deleted_delivery_id?: number;
  deleted_attachment_id?: number;
  booking_status?: string;
  client_request_status?: string | null;
  deliveries_remaining?: number;
  delivery?: DeliveryRecord;
}

export interface EscrowActionResponse {
  message: string;
  booking?: BookingRecord;
  escrow?: BookingEscrowSummary;
  escrow_status?: string;
}

export interface AdminEscrowResolutionInput {
  release_to_vendor: boolean;
  resolution_note?: string | null;
  evidence_summary?: string | null;
  tags?: string[];
}

export interface CollectionGatewayResponse {
  message: string;
  escrow_reference: string;
  gateway: Record<string, unknown>;
}

export interface WithdrawalRecord {
  id: number;
  reference: string;
  status: string;
  amount_minor: number;
  fee_minor: number;
  currency: string;
  destination_msisdn: string;
  provider: string;
  failure_reason?: string | null;
  external_transaction_id?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface WithdrawalListResponse {
  items: WithdrawalRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    pending: number;
    processing: number;
    paid: number;
    failed: number;
  };
}

export interface WithdrawalActionResponse {
  id?: number;
  reference?: string;
  status?: string;
  message: string;
  withdrawal: WithdrawalRecord;
}

export interface WithdrawalSummary {
  currency: string;
  balance_minor: number;
  latest_withdrawal: {
    reference: string;
    status: string;
    amount_minor: number;
    created_at: string;
  } | null;
}

export interface WithdrawalRequestInput {
  amount_minor: number;
  currency: string;
  msisdn: string;
  provider: string;
}

export interface DisputedEscrowRecord {
  id: number;
  reference: string;
  status: string;
  amount_minor: number;
  currency: string;
  client_label: string;
  vendor_label: string;
  disputed_at?: string | null;
  dispute_reason?: string | null;
  dispute_source?: string | null;
}

export interface AdminEscrowListResponse {
  items: DisputedEscrowRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    disputed: number;
  };
}

export interface ReviewRecord {
  id: number;
  booking_id: number;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface ReviewCreateInput {
  bookingId: number;
  rating: number;
  comment?: string | null;
}

export interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  category?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    unread: number;
    visible: number;
  };
}

export interface NotificationSummary {
  total: number;
  unread: number;
}

export interface DashboardShellSummary {
  notifications_unread: number;
  request_threads_unread: number;
  booking_threads_unread: number;
  inbox_total_unread: number;
  admin_pending_capabilities: number;
  admin_disputed_escrows: number;
}

export interface NotificationActionResponse {
  message: string;
  notification: NotificationRecord;
}

export interface MessageRecord {
  id: number;
  senderId: number;
  senderLabel: string;
  receiverId: number;
  receiverLabel: string;
  content: string;
  clientRequestId?: number | null;
  bookingId?: number | null;
  readAt?: string | null;
  createdAt: string;
}

export interface MessageSendInput {
  receiverId?: number;
  content: string;
}

export interface MessageUnreadSummary {
  request_unread: number;
  booking_unread: number;
  total_unread: number;
}

export interface ThreadSummaryRecord {
  thread_key: string;
  kind: 'request' | 'booking';
  id: number;
  title: string;
  subtitle: string;
  status: string;
  unread_count: number;
  preview: string;
  href: string;
  participant_id?: number | null;
  activity_at?: string | null;
}

export interface ThreadSummaryListResponse {
  items: ThreadSummaryRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    requests: number;
    bookings: number;
    unread: number;
  };
}

export interface VendorTrustSummary {
  vendor_id: number;
  vendor_label: string;
  completed_jobs_count: number;
  dispute_count: number;
  average_rating: number;
  escrow_release_ratio: number;
  on_time_delivery_ratio: number;
  refund_ratio: number;
  total_volume_minor: number;
  calculated_trust_score: number;
  risk_level: string;
  updated_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface AdminRiskOverview {
  summary: {
    users_monitored: number;
    medium_or_above_users: number;
    high_or_critical_users: number;
    critical_users: number;
    vendors_monitored: number;
  };
  latest_fraud_risks: Array<{
    id: number;
    user_id: number;
    user_label: string;
    score: number;
    risk_level: string;
    reason: string;
    created_at: string;
  }>;
  vendor_trust_watchlist: VendorTrustSummary[];
}

export interface AdminUserRecord {
  id: number;
  email: string;
  roles: string[];
  account_type: 'client' | 'vendor' | 'admin' | 'super_admin';
  is_verified: boolean;
  is_locked: boolean;
  created_at: string;
}

export interface AdminUserListResponse {
  items: AdminUserRecord[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  summary: {
    total: number;
    clients: number;
    vendors: number;
    admins: number;
    locked: number;
    unverified: number;
  };
}

export interface AdminUserActionResponse {
  message: string;
  user?: AdminUserRecord;
}

export interface AdminUserInput {
  email: string;
  password?: string;
  account_type: 'client' | 'vendor' | 'admin' | 'super_admin';
  is_verified: boolean;
  is_locked: boolean;
}

export interface AdminEscrowActionResponse {
  message: string;
  escrow: DisputedEscrowRecord;
}

export interface AdminEscrowSummary {
  disputed_count: number;
}
