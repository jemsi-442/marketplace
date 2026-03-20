# 🏦 Secure Escrow-Based Service Marketplace
### Enterprise Fintech-Grade Backend Architecture

A secure, scalable, and modular marketplace platform designed for protected service transactions using milestone-based escrow, AI-powered dispute resolution, and real-time fraud detection.

Built with Symfony and engineered following fintech security and architecture principles.

---

# 1️⃣ System Overview

The platform enables secure digital service transactions between vendors and clients.

Core flow:

Client → Booking → Escrow Creation → Milestone Execution → Fund Release  
↓  
AI Risk Monitoring & Fraud Scoring  
↓  
Audit Logging & Compliance Tracking  

---

# 2️⃣ Architectural Principles

✔ Modular Service-Oriented Architecture  
✔ Separation of Concerns  
✔ Stateless Authentication (JWT)  
✔ Role-Based Access Control  
✔ Event-Driven Monitoring  
✔ Auditable Financial Transactions  
✔ AI-Assisted Risk Analysis  

---

# 3️⃣ High-Level Architecture

Presentation Layer:
- REST Controllers
- GraphQL Support

Application Layer:
- Service Classes
- Business Logic
- Risk Engine
- Escrow Management

Domain Layer:
- Doctrine Entities
- Value Objects
- DTOs

Infrastructure Layer:
- Database
- Security Handlers
- Event Subscribers
- CLI Commands

---

# 4️⃣ Escrow Financial Engine

The escrow system is designed to simulate fintech-grade transactional flow:

## Escrow Lifecycle

1. Booking created
2. Escrow funded
3. Milestones defined
4. Partial releases (if applicable)
5. Final settlement
6. Audit logging

## Security Measures

- Escrow audit logs (EscrowAuditLog entity)
- Transaction monitoring subscriber
- Partial release validation
- Milestone dispute management
- Automatic escrow release command

---

# 5️⃣ Fraud Detection & Risk Engine

The platform includes a behavioral risk analysis subsystem.

Components:

- BehaviorAnalyzerService
- RiskEngineService
- TransactionMonitorService
- FraudRisk entity
- UserBehaviorProfile entity

## Risk Evaluation Factors

- Transaction frequency anomalies
- Booking value deviations
- User behavior patterns
- Escrow manipulation attempts

Each transaction is assigned a dynamic risk score.

---

# 6️⃣ AI Dispute Resolution Module

The AI subsystem assists in dispute handling.

Features:

- Dispute analysis
- Evidence scoring
- Outcome recommendation
- Confidence rating (DisputeAIResult DTO)
- AI interaction logging

This reduces manual intervention and accelerates resolution cycles.

---

# 7️⃣ Security Architecture

## Authentication
- JWT-based stateless authentication
- Refresh token mechanism
- Custom JwtAuthenticator

## Authorization
- Role hierarchy (Admin, Vendor, Client)
- BookingVoter for fine-grained permission control

## Additional Protections
- Password policy enforcement
- Login success/failure handlers
- Transaction event subscribers
- Secure token handling

---

# 8️⃣ Event-Driven Monitoring

Event Subscribers:

- TransactionSubscriber
- VendorProfileSubscriber

These monitor system changes and enforce integrity rules.

---

# 9️⃣ Data Model (Core Entities)

- User
- VendorProfile
- Service
- Booking
- Escrow
- EscrowMilestone
- PartialRelease
- Payment
- Dispute
- FraudRisk
- Message
- Notification

---

# 🔟 Scalability Strategy

The architecture is designed for horizontal scalability:

- Stateless JWT auth (API ready for load balancers)
- Service-layer isolation (microservice-ready)
- Risk engine separable into independent service
- AI module extractable to external ML service

---

# 1️⃣1️⃣ Compliance & Audit Readiness

- Escrow audit logging
- Transaction event tracking
- Fraud scoring persistence
- Behavioral profiling
- Dispute decision history

Designed to support future compliance integrations (KYC, AML, PSD2).

---

# 1️⃣2️⃣ Tech Stack

Framework:
- Symfony (PHP)

Database:
- Doctrine ORM

Security:
- Symfony Security Component
- JWT Authentication

Architecture:
- Service-Oriented Pattern
- Event-Driven Monitoring
- DTO Pattern
- Voter-Based Authorization

---

# 1️⃣3️⃣ Local Runbook

## Run the Backend

From the project root:

```bash
cd /home/jaykali/marketplace
php -S 127.0.0.1:8000 -t backend/public
```

The API does not define a homepage route, so `GET /` returning `404` is expected.
Use `/api/...` routes for verification.

## Run the Frontend

The new enterprise SaaS frontend lives in `frontend/`.

```bash
cd /home/jaykali/marketplace/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

The frontend expects the Symfony API at `http://127.0.0.1:8000` by default.

## Run API Tests

Fast local run against the current configured test environment:

```bash
cd /home/jaykali/marketplace/backend
composer test:api
```

Equivalent Make target:

```bash
make test-api
```

## Run the Quality Gate

Fast local quality gate:

```bash
cd /home/jaykali/marketplace/backend
composer quality:fast
```

Equivalent Make target:

```bash
make quality-fast
```

This runs:

- `composer validate --no-check-publish`
- PHP syntax lint across `src`, `tests`, `config`, and `bin`
- PHPStan static analysis across `src` at level 9
- Symfony container lint for `test` and `prod`
- API PHPUnit suite

Dependency advisory checks are kept in the stricter CI flow so local iteration stays fast.

## Run API Tests Against a Dedicated Test Database

1. Copy the example test env file:

```bash
cd /home/jaykali/marketplace/backend
cp .env.test.local.example .env.test.local
```

2. Set `TEST_DATABASE_URL` to a dedicated database such as `marketplace_test`.

Important:
- the DB user in `TEST_DATABASE_URL` must be able to create that database, or the database must already exist before you run the isolated flow
- if `composer quality:ci` stops at `doctrine:database:create`, fix DB privileges or pre-create `marketplace_test`, then rerun

3. Prepare the database and run the isolated suite:

```bash
composer test:api:isolated
```

Equivalent Make target:

```bash
make test-api-isolated
```

For the same flow plus linting/validation, use:

```bash
composer quality:ci
```

This additionally runs:

- `composer security:audit`

Safety guardrails:

- `prepare_test_db.sh` refuses to run if `TEST_DATABASE_URL` matches `DATABASE_URL`
- test logging is muted in `test` env to keep PHPUnit output readable
- the API suite currently covers auth/access, webhook idempotency, withdrawals, escrow release, and dispute resolution ledger flows
- GitHub Actions runs the same isolated quality gate via `.github/workflows/backend-ci.yml`

---

# 1️⃣4️⃣ Future Fintech Enhancements

- Stripe/PayPal Integration
- Webhook verification
- AML monitoring module
- KYC identity verification
- Distributed transaction processing
- Docker + Kubernetes deployment
- API Gateway integration

---

# 1️⃣5️⃣ Author

Jemsi Fredrick  
Backend Engineer | Fintech System Architect | Escrow Engine Designer
