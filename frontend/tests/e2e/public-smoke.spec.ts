import { expect, test } from '@playwright/test';

const renderTimeout = 20_000;

test.describe('Public smoke flows', () => {
  test.skip('homepage renders the current hero and primary entry actions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1').first()).toContainText('Run digital work with the right team', { timeout: renderTimeout });
    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('link', { name: 'Create account' }).first()).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('link', { name: 'Preview dashboards' }).first()).toBeVisible({ timeout: renderTimeout });

    const heroImage = page.locator('img[src*="home-hero-diverse-tech-project.jpg"]').first();
    await expect(heroImage).toBeVisible({ timeout: renderTimeout });
  });

  test('login page shows social auth and email entry', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /sign in with github/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByText('Email access')).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /enter workspace/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: renderTimeout });
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: renderTimeout });
  });

  test('register page shows role choice and social options', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: /create your place inside the wolfix marketplace/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible({ timeout: renderTimeout });
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible({ timeout: renderTimeout });
    const roleSelect = page.getByLabel(/how will you use wolfix/i);
    await expect(roleSelect).toBeVisible({ timeout: renderTimeout });
    await expect(roleSelect).toHaveValue('vendor');
    await roleSelect.selectOption('client');
    await expect(roleSelect).toHaveValue('client');
    await expect(page.getByRole('button', { name: /^create account$/i }).last()).toBeVisible({ timeout: renderTimeout });
  });
});
