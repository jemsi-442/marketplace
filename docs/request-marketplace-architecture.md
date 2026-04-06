# WOLFIX Request Marketplace Architecture

See also:

1. [List Endpoint Conventions](/home/jaykali/marketplace/docs/list-endpoint-conventions.md)

## Goal
Move WOLFIX from a vendor-offer marketplace toward a request marketplace where:

1. A client chooses a service type.
2. The client submits a request.
3. Matching vendors receive that request.
4. Vendors express interest or send a proposal.
5. Admin approves one vendor.
6. The client pays into escrow.
7. The selected vendor delivers the work.
8. The client reviews delivery and payment is released.

This preserves the existing escrow and payout foundation while changing the marketplace flow to match the product direction.

## Product Model

### Marketplace mode
WOLFIX should use a managed request marketplace model:

1. `Client` chooses a service type, not a vendor listing.
2. `Vendor` declares capabilities across multiple service types.
3. `Admin` helps assign the best vendor, especially in early platform phases.
4. `Booking` begins after assignment, not before.
5. `Escrow` and `Snippe` payment flows start after assignment and scope confirmation.

### Identity and privacy model
WOLFIX should treat the platform admin team as the coordination bridge between both sides:

1. `Client` should not see the assigned vendor identity.
2. `Vendor` should not see the client identity.
3. `Admin` is the only role that can see both sides of the request.
4. Client-facing updates should come from `WOLFIX` or `Admin`, not directly from a vendor identity.
5. Vendor-facing request feeds should describe the work only, without exposing client identity.
6. Assignment, pricing, and timeline confirmation should be communicated back to the client as platform-managed decisions.
7. Payment should remain on-platform until admin-approved payout or withdrawal.
8. Direct client-vendor messaging should stay disabled; communication should flow through admin-managed channels.

### Why this model fits WOLFIX
This model better supports:

1. Websites and software work with changing scope.
2. Social media and ongoing service operations.
3. Government consultancy and compliance jobs.
4. Local trust-building through admin-assisted assignment.
5. Clearer separation between discovery, assignment, payment, and delivery.

## Communication Model

Communication should remain platform-mediated:

1. `ClientRequest` stage should use an admin-managed request thread.
2. `Booking` stage should use an admin-managed booking thread.
3. `Client` should only see their own conversation with admin.
4. `Vendor` should only see their own conversation with admin.
5. `Admin` can see and manage both sides separately.
6. Shared inbox views may exist, but thread context should stay attached to the request or booking record.

## Core Entities

### 1. `ServiceType`
System-owned catalog entries that clients browse.

Suggested fields:

1. `id`
2. `name`
3. `slug`
4. `description`
5. `category`
6. `is_active`
7. `requires_admin_assignment`
8. `default_brief_template` nullable
9. `created_at`
10. `updated_at`

Examples:

1. `Website Development`
2. `Social Media Management`
3. `Bulk SMS Integration`
4. `BRELA Registration Support`

Notes:

1. This is the system-owned discovery catalog for clients.
2. `ServiceType` should power `/dashboard/request-services`.

### 2. `VendorServiceCapability`
Links a vendor to one or more service types they can deliver.

Suggested fields:

1. `id`
2. `vendor_profile_id`
3. `service_type_id`
4. `is_active`
5. `experience_level`
6. `starting_price_minor` nullable
7. `portfolio_summary` nullable
8. `capacity_status`
9. `turnaround_note` nullable
10. `approved_by_admin` boolean
11. `created_at`
12. `updated_at`

Notes:

1. Vendors must be able to choose more than one service type.
2. This entity powers request matching.
3. This is not the same thing as a public listing page.

### 3. `ClientRequest`
The client’s work request before a vendor is assigned.

Suggested fields:

1. `id`
2. `client_id`
3. `service_type_id`
4. `request_summary`
5. `scope_details` nullable
6. `deadline_note` nullable
7. `budget_note` nullable
8. `attachments_count` nullable
9. `status`
10. `submitted_at` nullable
11. `matched_at` nullable
12. `assigned_at` nullable
13. `cancelled_at` nullable
14. `created_at`
15. `updated_at`

Suggested statuses:

1. `draft`
2. `submitted`
3. `matched`
4. `vendor_interest_open`
5. `vendor_selected`
6. `awaiting_payment`
7. `funded`
8. `in_progress`
9. `delivery_submitted`
10. `revision_requested`
11. `completed`
12. `disputed`
13. `cancelled`

Notes:

1. A request exists before a booking exists.
2. This is the correct place for the client’s initial brief.

### 4. `VendorRequestInterest`
Stores vendor interest or proposal submissions for a client request.

Suggested fields:

1. `id`
2. `client_request_id`
3. `vendor_profile_id`
4. `message` nullable
5. `proposed_price_minor` nullable
6. `timeline_note` nullable
7. `status`
8. `submitted_at`
9. `reviewed_at` nullable
10. `created_at`
11. `updated_at`

Suggested statuses:

1. `submitted`
2. `shortlisted`
3. `approved`
4. `rejected`
5. `withdrawn`

Notes:

1. This is what vendors create when they want to take a job.
2. Admin uses this to compare interested vendors.

### 5. `Booking`
`Booking` should remain the active work order after vendor assignment.

Current entity:

1. [Booking.php](/home/jaykali/marketplace/backend/src/Entity/Booking.php)

Recommended changes:

1. Keep `client`
2. Keep `client_request`
3. Keep selected `vendor`
4. Keep `agreed_price_minor`
5. Keep `currency`
6. Add `started_at` nullable
7. Add `submitted_at` nullable
8. Add `completed_at` nullable

Suggested statuses:

1. `awaiting_payment`
2. `funded`
3. `in_progress`
4. `delivery_submitted`
5. `revision_requested`
6. `completed`
7. `cancelled`
8. `disputed`

Notes:

1. Booking should begin only after vendor assignment.
2. Existing escrow logic can remain attached to `Booking`.

### 6. `DeliverySubmission`
Stores delivery attempts inside the platform.

Suggested fields:

1. `id`
2. `booking_id`
3. `vendor_id`
4. `delivery_note`
5. `delivery_link` nullable
6. `status`
7. `submitted_at`
8. `reviewed_at` nullable
9. `created_at`

Suggested statuses:

1. `submitted`
2. `changes_requested`
3. `approved`

Notes:

1. This becomes the structured delivery point.
2. Files can be added later through a `DeliveryAttachment` entity if needed.

## Recommended Relationships

### Client journey side
1. `ClientRequest` belongs to one `User` client.
2. `ClientRequest` belongs to one `ServiceType`.
3. `ClientRequest` has many `VendorRequestInterest`.
4. `ClientRequest` has zero or one resulting `Booking`.

### Vendor side
1. `VendorProfile` has many `VendorServiceCapability`.
2. `VendorServiceCapability` belongs to one `ServiceType`.
3. `VendorRequestInterest` belongs to one `VendorProfile`.

### Execution side
1. `Booking` belongs to one `ClientRequest`.
2. `Booking` belongs to one selected vendor.
3. `Booking` has zero or one `Escrow`.
4. `Booking` has many `DeliverySubmission` over time.

## Lifecycle

### Client request lifecycle
1. Client chooses a service type.
2. Client submits a request.
3. System matches vendors by capability.
4. Vendors express interest.
5. Admin approves one vendor.
6. Request becomes assignment-ready.

### Booking lifecycle
1. System creates a booking after vendor assignment.
2. Client confirms scope and agreed amount.
3. Client pays into escrow.
4. Vendor starts work.
5. Vendor submits delivery.
6. Client approves or requests changes.
7. Payment is released.

## Payment Model

### Recommended payment timing
Do not ask for final payment before vendor assignment unless the job is extremely standardized.

Recommended order:

1. Client submits request.
2. Vendor is selected.
3. Scope and price are confirmed.
4. Client funds escrow.
5. Vendor begins work.

### Small jobs
Use full escrow payment after assignment.

### Larger jobs
Use deposit-first or milestone-based escrow later.

Notes:

1. Existing Snippe collection and payout flows can stay attached to escrow and booking.
2. Existing controllers and services can be reused after this model transition.

## API Proposal

### Client APIs
1. `GET /api/service-types`
2. `GET /api/service-types/{id}`
3. `POST /api/client-requests`
4. `GET /api/client-requests`
5. `GET /api/client-requests/{id}`
6. `POST /api/client-requests/{id}/confirm-assignment`

### Vendor APIs
1. `GET /api/vendor/service-capabilities`
2. `POST /api/vendor/service-capabilities`
3. `PATCH /api/vendor/service-capabilities/{id}`
4. `GET /api/vendor/request-feed`
5. `POST /api/client-requests/{id}/interest`
6. `GET /api/vendor/jobs`
7. `POST /api/bookings/{id}/deliveries`

### Admin APIs
1. `GET /api/admin/client-requests`
2. `GET /api/admin/client-requests/{id}`
3. `GET /api/admin/client-requests/{id}/interests`
4. `POST /api/admin/client-requests/{id}/assign`
5. `POST /api/admin/client-requests/{id}/reject-interest`

## Frontend Mapping

### Client
1. `/dashboard/client`
   - Workspace dashboard
2. `/dashboard/request-services`
   - Business lane landing page
3. `/dashboard/request-services/category/[slug]`
   - Lane-specific service discovery
4. `/dashboard/request-services/[id]`
   - Lane brief
5. `/dashboard/request-services/[id]/request`
   - Request form
6. `/dashboard/requests/[id]`
   - Request status, vendor assignment, payment, and progress

### Vendor
1. `/dashboard/vendor`
   - Vendor workspace dashboard
2. `/dashboard/vendor-capabilities`
   - Capability lane landing page
3. `/dashboard/vendor-capabilities/category/[slug]`
   - Lane-specific capability editor
4. `/dashboard/vendor-requests`
   - Matching request feed
5. `/dashboard/vendor-withdrawals`
   - Balance and payout flow

### Admin
1. `/dashboard/admin`
   - Operations dashboard
2. `/dashboard/admin-capabilities`
   - Capability lane review
3. `/dashboard/admin-requests`
   - Request queue and vendor comparison
4. `/dashboard/admin-escrows`
   - Payment and dispute oversight

## Migration Strategy

### Current State

Implemented:

1. `ServiceType`
2. `VendorServiceCapability`
3. `ClientRequest`
4. `VendorRequestInterest`
5. `Booking` linked to request-assignment flow
6. `DeliverySubmission`
7. `DeliveryAttachment`

Current outcome:

1. Client discovery is request-first
2. Vendor supply is capability-first
3. Assignment happens before booking
4. Delivery and payout remain inside the managed platform flow

## Practical Recommendation
Keep strengthening this model in the following order:

1. preserve request-first discovery
2. preserve capability-lane vendor supply
3. keep admin-mediated assignment and messaging boundaries
4. continue improving inbox/search scalability
5. continue hardening delivery, escrow, dispute, and payout operations

This keeps the platform stable while improving the managed request marketplace already in production.
