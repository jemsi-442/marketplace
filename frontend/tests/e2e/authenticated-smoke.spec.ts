import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const backendBaseURL = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://127.0.0.1:8000';
const password = 'Password123!';
const renderTimeout = 20_000;
const adminFixtureScriptPath = path.resolve(process.cwd(), '..', 'backend', 'tests', 'Fixtures', 'playwright_seed_admin_verification_fixture.php');
const bookingFixtureScriptPath = path.resolve(process.cwd(), '..', 'backend', 'tests', 'Fixtures', 'playwright_seed_booking_fixture.php');
const adminRequestFixtureScriptPath = path.resolve(process.cwd(), '..', 'backend', 'tests', 'Fixtures', 'playwright_seed_admin_request_review_fixture.php');
const vendorRequestFixtureScriptPath = path.resolve(process.cwd(), '..', 'backend', 'tests', 'Fixtures', 'playwright_seed_vendor_request_fixture.php');
const adminEscrowFixtureScriptPath = path.resolve(process.cwd(), '..', 'backend', 'tests', 'Fixtures', 'playwright_seed_admin_escrow_fixture.php');
const adminCapabilityFixtureScriptPath = path.resolve(process.cwd(), '..', 'backend', 'tests', 'Fixtures', 'playwright_seed_admin_capability_fixture.php');

async function registerAndVerify(api: APIRequestContext, email: string, type: 'client' | 'vendor') {
  const registerResponse = await api.post(`${backendBaseURL}/api/register`, {
    data: {
      email,
      password,
      type,
    },
  });

  expect(registerResponse.ok()).toBeTruthy();

  const registerPayload = await registerResponse.json();
  const verificationUrl = typeof registerPayload.verification_url === 'string' ? registerPayload.verification_url : null;

  expect(verificationUrl).toBeTruthy();

  const verifyResponse = await api.get(verificationUrl!);
  expect(verifyResponse.ok()).toBeTruthy();
}

async function browserJsonPost(page: Page, path: string, payload: Record<string, unknown>) {
  const response = await page.evaluate(
    async ({ targetPath, body }) => {
      const res = await fetch(targetPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const text = await res.text();

      return {
        ok: res.ok,
        status: res.status,
        text,
      };
    },
    { targetPath: path, body: payload },
  );

  expect(response.ok, `POST ${path} failed with status ${response.status}: ${response.text}`).toBeTruthy();
}

async function browserJsonGet(page: Page, path: string) {
  const response = await page.evaluate(async (targetPath) => {
    const res = await fetch(targetPath, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    const text = await res.text();

    return {
      ok: res.ok,
      status: res.status,
      text,
    };
  }, path);

  expect(response.ok, `GET ${path} failed with status ${response.status}: ${response.text}`).toBeTruthy();
  return response;
}

function parseSetCookieHeader(setCookie: string) {
  const [cookiePair, ...attributePairs] = setCookie.split(';').map((segment) => segment.trim());
  const separatorIndex = cookiePair.indexOf('=');
  const name = cookiePair.slice(0, separatorIndex);
  const value = cookiePair.slice(separatorIndex + 1);
  const attributes = new Map<string, string>();

  for (const attribute of attributePairs) {
    const attributeSeparatorIndex = attribute.indexOf('=');
    if (attributeSeparatorIndex === -1) {
      attributes.set(attribute.toLowerCase(), 'true');
      continue;
    }

    const key = attribute.slice(0, attributeSeparatorIndex).trim().toLowerCase();
    const parsedValue = attribute.slice(attributeSeparatorIndex + 1).trim();
    attributes.set(key, parsedValue);
  }

  const maxAge = attributes.get('max-age');
  const sameSite = attributes.get('samesite');

  return {
    name,
    value,
    domain: '127.0.0.1',
    path: attributes.get('path') ?? '/',
    httpOnly: attributes.has('httponly'),
    secure: attributes.has('secure'),
    sameSite:
      sameSite?.toLowerCase() === 'lax'
        ? 'Lax'
        : sameSite?.toLowerCase() === 'none'
          ? 'None'
          : 'Strict',
    expires: maxAge ? Math.floor(Date.now() / 1000) + Number(maxAge) : undefined,
  } as const;
}

interface AdminVerificationFixture {
  admin: {
    email: string;
    password: string;
  };
  vendor: {
    email: string;
    password: string;
    company_name: string;
  };
  profile_id: number;
}

interface BookingFixture {
  client: {
    email: string;
    password: string;
  };
  vendor: {
    email: string;
    password: string;
    company_name: string;
  };
  booking_id: number;
  request_summary: string;
}

interface AdminRequestReviewFixture {
  admin: {
    id: number;
    email: string;
    password: string;
  };
  client: {
    id: number;
    email: string;
  };
  vendor: {
    id: number;
    email: string;
    company_name: string;
  };
  request_id: number;
  interest_id: number;
  request_summary: string;
  service_name: string;
  timeline_note: string;
}

interface VendorRequestFixture {
  client: {
    email: string;
  };
  vendor: {
    email: string;
    password: string;
    company_name: string;
  };
  request_id: number;
  request_summary: string;
  service_name: string;
  timeline_note: string;
  scenario: 'open' | 'sent';
}

interface AdminEscrowFixture {
  admin: {
    email: string;
    password: string;
  };
  escrow: {
    id: number;
    reference: string;
  };
  booking_id: number;
  request_summary: string;
  dispute_reason: string;
}

interface AdminCapabilityFixture {
  admin: {
    email: string;
    password: string;
  };
  vendor: {
    email: string;
    company_name: string;
  };
  capability: {
    id: number;
    service_name: string;
    category: string;
  };
}

function seedAdminVerificationFixture(): AdminVerificationFixture {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const raw = execFileSync('php', [adminFixtureScriptPath, suffix], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(raw) as AdminVerificationFixture;
}

function seedBookingFixture(scenario: 'basic' | 'active_escrow' = 'basic'): BookingFixture {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const raw = execFileSync('php', [bookingFixtureScriptPath, suffix, scenario], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(raw) as BookingFixture;
}

function seedAdminRequestReviewFixture(): AdminRequestReviewFixture {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const raw = execFileSync('php', [adminRequestFixtureScriptPath, suffix], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(raw) as AdminRequestReviewFixture;
}

function seedVendorRequestFixture(scenario: 'open' | 'sent' = 'open'): VendorRequestFixture {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const raw = execFileSync('php', [vendorRequestFixtureScriptPath, suffix, scenario], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(raw) as VendorRequestFixture;
}

function seedAdminEscrowFixture(): AdminEscrowFixture {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const raw = execFileSync('php', [adminEscrowFixtureScriptPath, suffix], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(raw) as AdminEscrowFixture;
}

function seedAdminCapabilityFixture(): AdminCapabilityFixture {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const raw = execFileSync('php', [adminCapabilityFixtureScriptPath, suffix], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(raw) as AdminCapabilityFixture;
}

async function authenticateBrowserSession(api: APIRequestContext, page: Page, email: string, loginPassword = password) {
  const loginResponse = await api.post(`${backendBaseURL}/api/login`, {
    data: {
      email,
      password: loginPassword,
    },
  });

  expect(loginResponse.ok()).toBeTruthy();

  const sessionCookies = loginResponse
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => parseSetCookieHeader(header.value));

  expect(sessionCookies.length).toBeGreaterThan(0);

  await page.context().addCookies(sessionCookies);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
}

test.describe('Authenticated smoke flows', () => {
  test('verified client can open the client workspace after authentication', async ({ page, request }) => {
    const suffix = Date.now();
    const email = `e2e_client_${suffix}@test.com`;

    await registerAndVerify(request, email, 'client');
    await authenticateBrowserSession(request, page, email);
    await browserJsonGet(page, '/backend-api/api/protected/me');
    await page.goto('/dashboard/client', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Workspace', { timeout: renderTimeout });
    await expect(page.getByText('Start with discovery, then follow requests, payment, and protected work here.')).toBeVisible({ timeout: renderTimeout });
  });

  test('verified client can open business lanes after authentication', async ({ page, request }) => {
    const suffix = Date.now();
    const email = `e2e_client_lanes_${suffix}@test.com`;

    await registerAndVerify(request, email, 'client');
    await authenticateBrowserSession(request, page, email);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/request-services', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Business lanes', { timeout: renderTimeout });
    await expect(page.getByText('Choose a lane first, then open the exact service.')).toBeVisible({ timeout: renderTimeout });
  });

  test('verified client can open the requests workspace after authentication', async ({ page, request }) => {
    const suffix = Date.now();
    const email = `e2e_client_requests_${suffix}@test.com`;

    await registerAndVerify(request, email, 'client');
    await authenticateBrowserSession(request, page, email);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/requests', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Requests', { timeout: renderTimeout });
    await expect(page.getByText('Track your requests and open the next ready step.')).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor without verification sees the request gate after authentication', async ({ page, request }) => {
    const suffix = Date.now();
    const email = `e2e_vendor_${suffix}@test.com`;

    await registerAndVerify(request, email, 'vendor');
    await authenticateBrowserSession(request, page, email);
    await browserJsonGet(page, '/backend-api/api/protected/me');
    await browserJsonPost(page, '/backend-api/api/vendor/profile', { companyName: 'E2E Vendor Studio' });

    await page.goto('/dashboard/vendor-requests', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Requests', { timeout: renderTimeout });
    await expect(page.getByText('Finish verification before matched requests open')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('link', { name: /continue to verification/i })).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor can open capability lanes after authentication', async ({ page, request }) => {
    const suffix = Date.now();
    const email = `e2e_vendor_capabilities_${suffix}@test.com`;

    await registerAndVerify(request, email, 'vendor');
    await authenticateBrowserSession(request, page, email);
    await browserJsonGet(page, '/backend-api/api/protected/me');
    await browserJsonPost(page, '/backend-api/api/vendor/profile', { companyName: 'E2E Vendor Capabilities Studio' });

    await page.goto('/dashboard/vendor-capabilities', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Capability lanes', { timeout: renderTimeout });
    await expect(page.getByText('Start with one business lane first, then configure the exact capabilities your team can deliver well inside that vendor lane.')).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor can open the verification workspace after authentication', async ({ page, request }) => {
    const suffix = Date.now();
    const email = `e2e_vendor_verify_${suffix}@test.com`;

    await registerAndVerify(request, email, 'vendor');
    await authenticateBrowserSession(request, page, email);
    await browserJsonGet(page, '/backend-api/api/protected/me');
    await browserJsonPost(page, '/backend-api/api/vendor/profile', { companyName: 'E2E Vendor Verification Studio' });

    await page.goto('/dashboard/vendor-verification', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Verification', { timeout: renderTimeout });
    await expect(page.getByText('Upload your resume, answer the interview, and earn the blue tick.')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Resume upload', { exact: true })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Practical interview', { exact: true })).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor can open matched requests after authentication', async ({ page, request }) => {
    const fixture = seedVendorRequestFixture();

    await authenticateBrowserSession(request, page, fixture.vendor.email, fixture.vendor.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/vendor-requests', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Requests', { timeout: renderTimeout });
    await expect(page.getByText(fixture.request_summary).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(fixture.service_name).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.locator(`a[href="/dashboard/vendor-requests/${fixture.request_id}"]`).first()).toBeVisible({ timeout: renderTimeout });
  });


  test('client can open the booking workspace after authentication', async ({ page, request }) => {
    const fixture = seedBookingFixture();

    await authenticateBrowserSession(request, page, fixture.client.email, fixture.client.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/bookings/${fixture.booking_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Booking', { timeout: renderTimeout });
    await expect(page.getByText(fixture.request_summary).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /protect payment/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('No delivery yet')).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor can open the booking workspace after authentication', async ({ page, request }) => {
    const fixture = seedBookingFixture();

    await authenticateBrowserSession(request, page, fixture.vendor.email, fixture.vendor.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/bookings/${fixture.booking_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Booking', { timeout: renderTimeout });
    await expect(page.getByText(fixture.request_summary)).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /submit delivery/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /send update/i })).toBeVisible({ timeout: renderTimeout });
  });

  test('client can protect payment from the booking workspace', async ({ page, request }) => {
    const fixture = seedBookingFixture();

    await authenticateBrowserSession(request, page, fixture.client.email, fixture.client.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/bookings/${fixture.booking_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.getByRole('button', { name: /protect payment/i }).click();

    await expect(page.getByText('Escrow created successfully')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Ready for payment')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /open payment form/i })).toBeVisible({ timeout: renderTimeout });
  });

  test('client can release payment from the booking workspace', async ({ page, request }) => {
    const fixture = seedBookingFixture('active_escrow');

    await authenticateBrowserSession(request, page, fixture.client.email, fixture.client.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/bookings/${fixture.booking_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.getByRole('button', { name: /release payment/i }).click();

    await expect(page.getByText('Escrow released successfully')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Payment released')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Leave feedback', { exact: true })).toBeVisible({ timeout: renderTimeout });
  });

  test('client can dispute payment from the booking workspace', async ({ page, request }) => {
    const fixture = seedBookingFixture('active_escrow');
    const disputeReason = 'The delivery does not match the agreed scope and the booking needs admin review before payment continues.';

    await authenticateBrowserSession(request, page, fixture.client.email, fixture.client.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/bookings/${fixture.booking_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.getByRole('button', { name: /need help/i }).click();
    await page.getByLabel('What should admin review?').fill(disputeReason);
    await page.getByRole('button', { name: /send to admin review/i }).click();

    await expect(page.getByText('Escrow dispute opened')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Under review')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(disputeReason)).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor can submit a delivery from the booking workspace', async ({ page, request }) => {
    const fixture = seedBookingFixture();
    const deliveryNote = 'Delivery pack is ready for review with the first handoff summary and next checks.';

    await authenticateBrowserSession(request, page, fixture.vendor.email, fixture.vendor.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/bookings/${fixture.booking_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.getByLabel('Delivery note').fill(deliveryNote);
    await page.getByRole('button', { name: /submit delivery/i }).click();

    await expect(page.getByText('Delivery submitted successfully')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Delivery submitted. The booking record and attachment links have been refreshed.')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(deliveryNote)).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor can open a matched request detail and submit a proposal', async ({ page, request }) => {
    const fixture = seedVendorRequestFixture();
    const priceReason = 'This price covers the first delivery pass, platform coordination, and one review update for the client.';
    const adminMessage = 'We can keep the client updated clearly and stay inside the agreed timing window.';

    await authenticateBrowserSession(request, page, fixture.vendor.email, fixture.vendor.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/vendor-requests/${fixture.request_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Request', { timeout: renderTimeout });
    await expect(page.getByText(fixture.service_name)).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(fixture.request_summary)).toBeVisible({ timeout: renderTimeout });

    await page.getByLabel('Your price').fill('295000');
    await page.getByLabel('Delivery time').fill(fixture.timeline_note);
    await page.getByLabel('Why this price').fill(priceReason);
    await page.getByLabel('Extra note for admin').fill(adminMessage);
    await page.getByRole('button', { name: /send proposal/i }).click();

    await expect(page.getByText('Interest submitted successfully')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Proposal sent')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Wait for admin review before sending anything else.')).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor can open the sent proposal view after authentication', async ({ page, request }) => {
    const fixture = seedVendorRequestFixture('sent');

    await authenticateBrowserSession(request, page, fixture.vendor.email, fixture.vendor.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/vendor-requests', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Requests', { timeout: renderTimeout });
    await expect(page.getByText(fixture.request_summary).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Proposal sent').first()).toBeVisible({ timeout: renderTimeout });
    await page.getByRole('button', { name: /^proposal sent$/i }).click();
    await expect(page.getByText('Showing requests where you already sent a proposal')).toBeVisible({ timeout: renderTimeout });
    await expect(page.locator(`a[href="/dashboard/vendor-requests/${fixture.request_id}"]`).first()).toBeVisible({ timeout: renderTimeout });
  });

  test('vendor can open a sent proposal detail after authentication', async ({ page, request }) => {
    const fixture = seedVendorRequestFixture('sent');

    await authenticateBrowserSession(request, page, fixture.vendor.email, fixture.vendor.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/vendor-requests/${fixture.request_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Request', { timeout: renderTimeout });
    await expect(page.getByText(fixture.request_summary).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Proposal sent').first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Status:').first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Wait for admin review before sending anything else.')).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can open the request review list after authentication', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/admin-requests', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Requests', { timeout: renderTimeout });
    await expect(page.getByText(fixture.request_summary).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(fixture.service_name).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('link', { name: /open request review/i }).first()).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can open the users list after authentication', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/admin-users', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Users', { timeout: renderTimeout });
    await expect(page.getByText(fixture.vendor.email).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /^vendors$/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('link', { name: /open user/i }).first()).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can open the capability lanes after authentication', async ({ page, request }) => {
    const fixture = seedAdminCapabilityFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/admin-capabilities', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Capability lanes', { timeout: renderTimeout });
    await expect(page.getByText(fixture.capability.service_name).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(fixture.vendor.company_name).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.locator(`a[href="/dashboard/admin-capabilities/${fixture.capability.id}"]`).first()).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can open one capability review after authentication', async ({ page, request }) => {
    const fixture = seedAdminCapabilityFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-capabilities/${fixture.capability.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Capability review', { timeout: renderTimeout });
    await expect(page.getByText(fixture.capability.service_name).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(fixture.vendor.company_name).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Approve or return this lane')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /approve capability/i })).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can approve a capability after authentication', async ({ page, request }) => {
    const fixture = seedAdminCapabilityFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-capabilities/${fixture.capability.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.locator('textarea').fill('Capability proof, price, and turnaround are clear enough for matching.');
    await page.getByRole('button', { name: /approve capability/i }).click();

    await expect(page.getByText('Capability approved successfully')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Approved').first()).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can return a capability for changes after authentication', async ({ page, request }) => {
    const fixture = seedAdminCapabilityFixture();
    const returnNote = 'Clarify the delivery proof and tighten the price reason before this lane can go live.';

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-capabilities/${fixture.capability.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.locator('textarea').fill(returnNote);
    await page.getByRole('button', { name: /return for changes/i }).click();

    await expect(page.getByText('Capability returned for changes')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Returned').first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('p').filter({ hasText: returnNote }).first()).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can open one user detail after authentication', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-users/${fixture.vendor.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('User', { timeout: renderTimeout });
    await expect(page.getByText(fixture.vendor.email).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Account summary')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Update account')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /update user/i })).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can create a new user after authentication', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();
    const newUserEmail = `e2e_admin_created_${Date.now()}@test.com`;

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/admin-users/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('New user', { timeout: renderTimeout });

    await page.getByLabel('Email').fill(newUserEmail);
    await page.getByLabel('Password').fill('Password123!');
    await page.getByLabel('Account type').selectOption('vendor');
    await page.getByRole('button', { name: /create user/i }).click();

    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('User', { timeout: renderTimeout });
    await expect(page.getByText(newUserEmail).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Account summary')).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can update a user after authentication', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();
    const updatedEmail = `e2e_admin_updated_${Date.now()}@test.com`;

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-users/${fixture.vendor.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.getByLabel('Email').fill(updatedEmail);
    await page.getByRole('button', { name: /update user/i }).click();

    await expect(page.getByText('User account updated.')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(updatedEmail).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Account summary')).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can lock and unlock a user after authentication', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-users/${fixture.vendor.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /lock account/i })).toBeVisible({ timeout: renderTimeout });

    await page.getByRole('button', { name: /lock account/i }).click();
    await expect(page.getByText('User account locked')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Locked').first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /unlock account/i })).toBeVisible({ timeout: renderTimeout });

    await page.getByRole('button', { name: /unlock account/i }).click();
    await expect(page.getByText('User account unlocked')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Active').first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /lock account/i })).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can create and delete a new user after authentication', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();
    const newUserEmail = `e2e_admin_delete_${Date.now()}@test.com`;

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/admin-users/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.getByLabel('Email').fill(newUserEmail);
    await page.getByLabel('Password').fill('Password123!');
    await page.getByLabel('Account type').selectOption('client');
    await page.getByRole('button', { name: /create user/i }).click();

    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(newUserEmail).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /delete account/i })).toBeVisible({ timeout: renderTimeout });

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole('button', { name: /delete account/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/admin-users$/, { timeout: renderTimeout });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(newUserEmail)).toHaveCount(0, { timeout: renderTimeout });
  });

  test('admin can open request review detail after authentication', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-requests/${fixture.request_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Request review', { timeout: renderTimeout });
    await expect(page.getByText(fixture.service_name)).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(fixture.request_summary)).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Final platform update', { exact: true })).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can assign selected path from request review', async ({ page, request }) => {
    const fixture = seedAdminRequestReviewFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-requests/${fixture.request_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.getByRole('button', { name: fixture.vendor.company_name }).click();
    await page.getByLabel('Platform note').fill('Assign this vendor path and keep the client ready for payment.');
    await page.getByRole('button', { name: /assign selected path/i }).click();

    await expect(page.getByText('Vendor assigned successfully')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('awaiting_payment')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(`Selected proposal: ${fixture.vendor.company_name}.`)).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can open the disputed escrows list after authentication', async ({ page, request }) => {
    const fixture = seedAdminEscrowFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/admin-escrows', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Disputes', { timeout: renderTimeout });
    await expect(page.getByText(fixture.escrow.reference).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(fixture.dispute_reason).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /refund client/i }).first()).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can resolve a disputed escrow after authentication', async ({ page, request }) => {
    const fixture = seedAdminEscrowFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/admin-escrows', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page.getByPlaceholder('Resolution note for the final decision').first().fill('Refund approved because the dispute evidence shows the work was incomplete.');
    await page.getByPlaceholder('Evidence summary').first().fill('Client screenshots and the missing asset checklist support a refund.');
    await page.getByPlaceholder('Tags, separated by commas').first().fill('refund, scope-mismatch');
    await page.getByRole('button', { name: /refund client/i }).first().click();

    await expect(page.getByText('Escrow dispute resolved')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(fixture.escrow.reference)).toHaveCount(0, { timeout: renderTimeout });
  });

  test('admin can open the vendor verification queue after authentication', async ({ page, request }) => {
    const fixture = seedAdminVerificationFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto('/dashboard/admin-verifications', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Vendor verification', { timeout: renderTimeout });
    await expect(page.getByRole('heading', { name: fixture.vendor.company_name }).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('link', { name: /open verification/i }).first()).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can open vendor verification detail after authentication', async ({ page, request }) => {
    const fixture = seedAdminVerificationFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-verifications/${fixture.profile_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('h1').first()).toContainText('Vendor verification', { timeout: renderTimeout });
    await expect(page.getByText(fixture.vendor.company_name)).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Read the vendor answers')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Attempt trend')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /download resume/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /approve blue tick/i })).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can approve vendor verification after authentication', async ({ page, request }) => {
    const fixture = seedAdminVerificationFixture();

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-verifications/${fixture.profile_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    await page
      .getByPlaceholder('Write the reason clearly. If you revoke the badge, explain what proof is still missing.')
      .fill('Interview proof is clear enough for badge approval.');
    await page.getByRole('button', { name: /approve blue tick/i }).click();

    await expect(page.getByText('Vendor verification approved and blue tick is active.')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Blue tick active').first()).toBeVisible({ timeout: renderTimeout });
  });

  test('admin can revoke vendor verification after authentication', async ({ page, request }) => {
    const fixture = seedAdminVerificationFixture();
    const revokeNote = 'Revoke until the vendor adds stronger handoff evidence.';

    await authenticateBrowserSession(request, page, fixture.admin.email, fixture.admin.password);
    await browserJsonGet(page, '/backend-api/api/protected/me');

    await page.goto(`/dashboard/admin-verifications/${fixture.profile_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: renderTimeout });

    const reviewNote = page.getByPlaceholder('Write the reason clearly. If you revoke the badge, explain what proof is still missing.');
    await reviewNote.fill('Approve first so revoke checks the full badge lifecycle.');
    await page.getByRole('button', { name: /approve blue tick/i }).click();
    await expect(page.getByText('Vendor verification approved and blue tick is active.')).toBeVisible({ timeout: renderTimeout });

    await reviewNote.fill(revokeNote);
    await page.getByRole('button', { name: /revoke blue tick/i }).click();

    await expect(page.getByText('Vendor verification badge revoked and the profile now needs revision.')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Needs revision').first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText(revokeNote).first()).toBeVisible({ timeout: renderTimeout });
  });
});
