import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('social and profile flows', () => {
  test('loads social lists, searches users and sends a request', async ({ page }) => {
    await login(page);

    await page.goto('/friends', { waitUntil: 'commit', timeout: 10_000 });
    await expect(page.getByText('Ana', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Pedidos|Requests/i }).click();
    await expect(page.getByText('Luis', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Amigos|Friends/i }).click();
    await page.getByPlaceholder(/Procura por @username ou nome|Search by @username or name/i).fill('mia');
    await expect(page.getByText('Mia', { exact: true })).toBeVisible();
    await page.getByText('Mia', { exact: true }).locator('../..').getByRole('button').click();
    await expect(page.getByText(/Pedido enviado|Request sent/i)).toBeVisible();
  });

  test('opens profile and exposes identity/progression controls', async ({ page }) => {
    await login(page);

    await page.goto('/profile', { waitUntil: 'commit', timeout: 10_000 });
    await expect(page.getByText(/E2E User|e2e/i).first()).toBeVisible();
    await expect(page.getByText(/Spark|XP|Arena/i).first()).toBeVisible();
    await expect(page.getByText(/Definições|Settings|Arena|XP/i).first()).toBeVisible();
  });
});
