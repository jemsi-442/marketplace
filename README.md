# WOLFIX Marketplace Platform

Full-stack managed request marketplace for digital services, vendor capability lanes, protected bookings, escrow-backed payments, delivery review, disputes, and withdrawals.

This repository contains the **entire system**, not just the backend:

1. `backend/` - Symfony API, auth, business rules, escrow, messaging, disputes, withdrawals, tests
2. `frontend/` - Next.js dashboard and marketing app for clients, vendors, and admins
3. `docs/` - architecture notes, list endpoint conventions, and release QA checklists

## Product Model

WOLFIX now uses a **managed request marketplace** model:

1. Client opens **business lanes**
2. Client opens one lane brief and submits a **request**
3. Matching vendors respond through **capability lanes**
4. Admin reviews proposals and selects one vendor
5. Client moves into **booking**
6. Payment protection and escrow-backed flow begin
7. Delivery, revision, dispute, and payout flows continue inside the workspace

This is no longer the old public vendor-offer marketplace flow.

## Current Core Flows

### Client

1. Browse `business lanes`
2. Submit `ClientRequest`
3. Track updates in `Requests`
4. Use `Communications`
5. Open `Booking`
6. Review delivery and payment state

### Vendor

1. Configure `capability lanes`
2. Receive matched work in `Vendor requests`
3. Submit proposals
4. Work through booking delivery flow
5. Request payouts in `Vendor withdrawals`

### Admin

1. Review `capability lanes`
2. Review and assign `Admin requests`
3. Coordinate both sides in `Communications`
4. Manage disputes in `Admin escrows`
5. Monitor platform activity in the admin dashboard

## Tech Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- TanStack Query
- Zustand
- React Hook Form + Zod

### Backend

- Symfony
- Doctrine ORM
- Symfony Security
- JWT-backed session/auth flow
- Google and GitHub social login callbacks through the same session cookies
- Rate limiting
- Escrow and payout services
- PHPUnit API suite

## Architecture Notes

The current product direction is:

1. `ServiceType` powers client discovery
2. `VendorServiceCapability` powers vendor supply
3. `ClientRequest` is the pre-booking work intake
4. `VendorRequestInterest` stores vendor proposals
5. `Booking` is the active work order after assignment
6. Escrow, delivery, dispute, and payout stay attached to booking/workspace flow

Important:

- the old public `Service` marketplace model has been retired from the active product flow
- bookings now follow the current path:

```text
ServiceType -> ClientRequest -> Vendor proposal -> Admin assignment -> Booking
```

## Repository Structure

```text
marketplace/
├── backend/
├── frontend/
├── docs/
└── README.md
```

Useful docs:

- [Request Marketplace Architecture](./docs/request-marketplace-architecture.md)
- [List Endpoint Conventions](./docs/list-endpoint-conventions.md)
- [Release QA Checklist](./docs/release-qa-checklist.md)
- [Upload Malware Scanning](./docs/upload-malware-scanning.md)

## Run Locally

### Backend

From the project root:

```bash
cd /home/jaykali/marketplace
bash backend/bin/dev-server.sh 8000
```

Backend default URL:

```text
http://127.0.0.1:8000
```

The API does not define a homepage route, so `GET /` returning `404` is expected.

### Frontend

```bash
cd /home/jaykali/marketplace/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend default URL:

```text
http://127.0.0.1:3000
```

By default, the frontend expects the Symfony API at:

```text
http://127.0.0.1:8000
```

If you want Google/GitHub login locally, backend env setup now also needs:

```text
FRONTEND_PUBLIC_URL=http://localhost:3000
OAUTH_PUBLIC_API_BASE_URL=http://localhost:3000/backend-api
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
```

## Frontend Dev Performance Note

To reduce RAM pressure on lower-spec PCs:

1. `npm run dev` uses the lighter webpack dev server by default
2. `npm run dev:turbo` is still available if you explicitly want Turbopack
3. if cache grows too large, clear it with:

```bash
cd /home/jaykali/marketplace/frontend
npm run clean:cache
```

## Testing

### Backend Full API Suite

```bash
cd /home/jaykali/marketplace/backend
bash run_test_env_command.sh php bin/phpunit tests/Api
```

Current expected result:

```text
OK (53 tests, 1054 assertions)
```

### Focused Backend Suites

```bash
cd /home/jaykali/marketplace/backend
composer test:api:security
composer test:api:lists
composer test:api:disputes
composer test:api:withdrawal-ledger
```

### Frontend

```bash
cd /home/jaykali/marketplace/frontend
npm run typecheck
```

Optional local build check:

```bash
npm run build
```

## Security and Reliability Highlights

This repository now includes hardening around:

1. secure delivery attachment handling
2. admin/vendor role separation
3. request creation rate limiting
4. inbox thread summary performance improvements
5. vendor request feed query batching
6. capability save-path query reduction
7. calmer frontend query/refetch behavior across dashboards
8. Google/GitHub social login using the same backend session model
9. upload rate limiting and ClamAV-ready malware scanning hooks

## Release Readiness

Before deploys or after large refactors, use:

- [Release QA Checklist](./docs/release-qa-checklist.md)

That checklist covers:

1. automated verification
2. client/vendor/admin core flow QA
3. security regression checks
4. performance checks
5. remaining watchpoints

## Current Remaining Watchpoints

The system is in a strong state, but these are still worth monitoring under real traffic:

1. inbox search paths are not yet fully DB-side paginated for every combination
2. some detail pages still use intentional polling for freshness
3. local `next build` behavior can vary by machine resources

## Summary

This repository is now best understood as a **full marketplace workspace platform**:

1. client discovery and request intake
2. vendor capability management and proposals
3. admin assignment and coordination
4. booking, escrow, delivery, disputes, and withdrawals
5. full-stack testing, hardening, and release QA support
