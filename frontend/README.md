# Frontend Workspace

Next.js frontend for the WOLFIX marketplace platform.

This app powers:

1. client `business lanes`, requests, bookings, inbox, and alerts
2. vendor `capability lanes`, request feed, bookings, and withdrawals
3. admin request review, capability review, inbox coordination, and dispute oversight
4. marketing and public account flows
5. email/password plus Google/GitHub entry points for account access

For the full repository overview, start with:

- [Root README](../README.md)

Useful system docs:

- [Request Marketplace Architecture](../docs/request-marketplace-architecture.md)
- [List Endpoint Conventions](../docs/list-endpoint-conventions.md)
- [Release QA Checklist](../docs/release-qa-checklist.md)

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- TanStack Query
- Zustand
- React Hook Form + Zod

## Run Locally

```bash
cd /home/jaykali/marketplace/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

Default backend base URL:

```text
http://127.0.0.1:8000
```

Social login buttons use the same `/backend-api` proxy path. Provider credentials and callback URLs are configured in `backend/.env`, not in the frontend env file.

## Key Commands

### Development

```bash
npm run dev
```

### Type checking

```bash
npm run typecheck
```

### Local build

```bash
npm run build
```

### Clear local cache

```bash
npm run clean:cache
```

## Dev Performance Note

To reduce RAM pressure on lower-spec PCs:

1. `npm run dev` uses the lighter webpack dev server by default
2. `npm run dev:turbo` is still available if you explicitly want Turbopack
3. if `.next` grows too large or dev feels heavy, clear it with:

```bash
npm run clean:cache
```

## Frontend Responsibilities

The frontend is responsible for:

1. lane-based service discovery for clients
2. capability-lane editing for vendors
3. dashboard navigation and role-specific workspace views
4. booking workspace UI
5. inbox and alert interfaces
6. admin review and operations screens

## Verification Expectation

Minimum frontend verification after meaningful changes:

```bash
cd /home/jaykali/marketplace/frontend
npm run typecheck
```

For broader release confidence, also use:

- [Release QA Checklist](../docs/release-qa-checklist.md)
