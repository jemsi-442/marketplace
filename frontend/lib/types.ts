export type AppRole = 'ROLE_ADMIN' | 'ROLE_VENDOR' | 'ROLE_USER';

export interface AuthUser {
  id: number | null;
  email: string;
  roles: AppRole[];
  is_verified: boolean;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
  verification_required?: boolean;
  verification_email_sent?: boolean;
  verification_url?: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
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
  user_id?: number;
  message?: string;
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
}

export interface ServiceListItem {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  price_cents: number;
  is_active: boolean;
  vendor_user_id: number;
}

export interface ServiceUpsertInput {
  title: string;
  description?: string | null;
  category?: string | null;
  price_cents: number;
}

export interface BookingEscrowSummary {
  id: number | null;
  reference: string;
  status: string;
  amount_minor: number;
  currency: string;
}

export interface BookingRecord {
  id: number;
  service_id: number;
  service_title: string;
  client_id: number;
  status: string;
  created_at: string;
  escrow: BookingEscrowSummary | null;
}

export interface BookingCreateResponse {
  message: string;
  booking_id: number;
  status: string;
}

export interface EscrowActionResponse {
  message: string;
  escrow?: BookingEscrowSummary;
  escrow_status?: string;
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
  client: string;
  vendor: string;
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
  isRead: boolean;
  createdAt: string;
}

export interface MessageRecord {
  id: number;
  senderId: number;
  senderEmail: string;
  receiverId: number;
  receiverEmail: string;
  content: string;
  createdAt: string;
}

export interface MessageSendInput {
  receiverId: number;
  content: string;
}
