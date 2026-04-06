# Backend Workspace

Symfony backend for the WOLFIX marketplace platform.

This backend is responsible for:

1. authentication and session/token flows
2. role authorization and workspace boundaries
3. client requests and vendor proposals
4. admin assignment and coordination logic
5. booking, escrow, delivery, disputes, and payout workflows
6. notifications, messaging, and list endpoints
7. API regression coverage and operational commands

For the full repository overview, start with:

- [Root README](../README.md)

Useful shared docs:

- [Request Marketplace Architecture](../docs/request-marketplace-architecture.md)
- [List Endpoint Conventions](../docs/list-endpoint-conventions.md)
- [Release QA Checklist](../docs/release-qa-checklist.md)

## Stack

- Symfony
- Doctrine ORM
- Symfony Security
- PHPUnit
- MariaDB/MySQL

## Run Locally

From the project root:

```bash
cd /home/jaykali/marketplace
bash backend/bin/dev-server.sh 8000
```

Default backend URL:

```text
http://127.0.0.1:8000
```

The API does not define a homepage route, so `GET /` returning `404` is expected.

## Environment Files

Common files:

1. `.env`
2. `.env.example`
3. `.env.test`
4. `.env.test.local`
5. `.env.test.local.example`

Use `.env.test.local` for local test database overrides when needed.

Social login variables now live in backend env files as well:

1. `FRONTEND_PUBLIC_URL`
2. `OAUTH_PUBLIC_API_BASE_URL`
3. `OAUTH_STATE_TTL`
4. `GOOGLE_OAUTH_CLIENT_ID`
5. `GOOGLE_OAUTH_CLIENT_SECRET`
6. `GITHUB_OAUTH_CLIENT_ID`
7. `GITHUB_OAUTH_CLIENT_SECRET`

For local development with the current proxy setup, the important redirect base is usually:

```text
FRONTEND_PUBLIC_URL=http://localhost:3000
OAUTH_PUBLIC_API_BASE_URL=http://localhost:3000/backend-api
```

## Important Commands

### Full backend API suite

```bash
cd /home/jaykali/marketplace/backend
bash run_test_env_command.sh php bin/phpunit tests/Api
```

Current expected result:

```text
OK (38 tests, 868 assertions)
```

### Focused suites

```bash
cd /home/jaykali/marketplace/backend
composer test:api:security
composer test:api:lists
composer test:api:disputes
composer test:api:withdrawal-ledger
composer test:api:service-catalog
```

### Migrations

```bash
cd /home/jaykali/marketplace/backend
php bin/console doctrine:migrations:migrate --no-interaction
```

### Test DB helper

```bash
cd /home/jaykali/marketplace/backend
bash run_test_env_command.sh php bin/phpunit tests/Api
```

This wrapper ensures test-env commands use the isolated test database configuration.

## Current Backend Responsibilities in Product Terms

The backend now supports the current managed marketplace model:

1. `ServiceType` for client discovery
2. `VendorServiceCapability` for vendor supply
3. `ClientRequest` for intake before booking
4. `VendorRequestInterest` for proposals
5. `Booking` for assigned work
6. escrow, delivery, disputes, and withdrawals after assignment

## Security and Reliability Notes

Recent hardening includes:

1. secure delivery attachment handling outside public web paths
2. stricter admin/vendor workspace separation
3. request creation rate limiting
4. inbox query scalability improvements
5. batched request-feed and capability-save paths
6. Google and GitHub social login through the existing cookie-session flow

## Minimum Verification After Backend Changes

At minimum:

```bash
cd /home/jaykali/marketplace/backend
bash run_test_env_command.sh php bin/phpunit tests/Api
```

For release confidence, also follow:

- [Release QA Checklist](../docs/release-qa-checklist.md)
