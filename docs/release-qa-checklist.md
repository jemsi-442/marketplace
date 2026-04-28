# Release QA Checklist

Use this checklist before deployment, after major refactors, or after security/performance hardening work.

## 1. Automated Checks

### Backend

From `/home/jaykali/marketplace/backend`:

```bash
bash run_test_env_command.sh php bin/phpunit tests/Api
```

Expected result:

```text
OK (53 tests, 1054 assertions)
```

### Frontend

From `/home/jaykali/marketplace/frontend`:

```bash
npm run typecheck
```

Optional local build check:

```bash
npm run build
```

Note: on lower-spec local machines, `next build` may be less reliable than `typecheck` if the local build worker is unstable. Treat `typecheck` as the minimum gate and verify the browser flow directly when needed.

## 2. Core Flow QA

### Client

Verify:

1. Sign up, verify email, and sign in.
2. Open `Business lanes`.
3. Open a lane, then a lane brief.
4. Submit a request.
5. Open `Requests` and confirm the request appears.
6. Open `Communications` and confirm request threads appear.
7. Open booking after admin assignment/payment-ready state.
8. Confirm booking thread, payment status, and delivery flow are reachable.

### Vendor

Verify:

1. Sign up as vendor and sign in.
2. Open `Capability lanes`.
3. Configure at least one lane with:
   - starting price
   - experience level
   - turnaround
   - portfolio summary
4. Confirm saved lane appears in the correct grouped lane page.
5. Open `Vendor requests`.
6. Submit one proposal from a matching request.
7. Open `Vendor withdrawals`.
8. Confirm balances, withdrawal submission, and history list render correctly.

### Admin

Verify:

1. Sign in as admin.
2. Open `Capability lanes` review page.
3. Approve or return one vendor lane.
4. Open `Admin requests`.
5. Review one request and assign one vendor proposal.
6. Open `Communications`.
7. Confirm admin sees request and booking threads with participant context.
8. Open `Admin escrows` and verify dispute list renders.

## 3. Security QA

### Upload Safety

Verify:

1. Submit a delivery with an allowed file type.
2. Confirm the attachment opens via the secure application route, not a raw public uploads URL.
3. Confirm the response is access-controlled.
4. If malware scanning is enabled in the environment, verify uploads fail safely when the scanner reports malware.

### Role Boundaries

Verify:

1. Admin cannot use vendor-only routes as if they were a vendor.
2. Vendor cannot open admin-only pages.
3. Client cannot open vendor/admin workspaces.

### Messaging

Verify:

1. Request threads only open for permitted participants.
2. Booking threads only open for permitted participants.
3. Unread counts drop after reading a thread.

## 4. Performance QA

### Dashboard Navigation

Verify:

1. Move repeatedly between dashboard pages.
2. Confirm sidebar stays fixed and layout persists.
3. Confirm pages do not feel like full reloads.

### Inbox

Verify:

1. Open `Communications`.
2. Switch between `all`, `request`, `booking`, and `unread`.
3. Confirm pagination still works.
4. Confirm previews show the latest message, not an older one.

### Lists

Verify:

1. `Bookings`
2. `Vendor requests`
3. `Admin users`
4. `Admin escrows`
5. `Alerts`

For each:

1. change page
2. change filter
3. change search
4. confirm the list stays stable without obvious blinking or heavy refetch churn

## 5. Scalability Watchpoints

These are the remaining areas to keep an eye on under real traffic:

1. Inbox search paths are not yet fully DB-side paginated for every combination.
2. Detail pages still use intentional polling for freshness.
3. Local Next.js build worker behavior may vary by machine resources.

## 6. Production Readiness Snapshot

This project is in a strong state when the following are all true:

1. Backend API suite is green.
2. Frontend typecheck is green.
3. Client request -> booking flow works.
4. Vendor capability -> proposal -> withdrawal flow works.
5. Admin review -> inbox -> dispute flow works.
6. Attachments download through the secure route.
7. Navigation feels stable on desktop and mobile.

## 7. Useful Commands

### Backend

```bash
cd /home/jaykali/marketplace/backend
bash run_test_env_command.sh php bin/phpunit tests/Api
```

### Frontend

```bash
cd /home/jaykali/marketplace/frontend
npm run typecheck
npm run dev
```

If local cache ever becomes too heavy again:

```bash
cd /home/jaykali/marketplace/frontend
npm run clean:cache
```
