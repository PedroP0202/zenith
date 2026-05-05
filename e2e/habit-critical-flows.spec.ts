import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('critical habit flows', () => {
  test('login, create, complete, edit, delete and restore a habit', async ({ page }) => {
    await login(page);

    await page.locator('#add-habit-empty').click();
    await expect(page).toHaveURL(/\/habit\/new/);
    await page.locator('#title').fill('Ler documentação');
    await page.getByRole('button', { name: /Criar/i }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Ler documentação')).toBeVisible();

    await page.getByLabel('Marcar como feito').click();
    await expect(page.getByText('100%').first()).toBeVisible();

    const detailHref = await page.locator('a[href^="/habit/detail"]').first().getAttribute('href');
    expect(detailHref).toBeTruthy();
    await page.locator('a[href^="/habit/detail"]').first().click({ force: true });
    if (!/\/habit\/detail\?id=/.test(page.url())) {
      await page.goto(detailHref!, { waitUntil: 'commit', timeout: 30_000 });
    }
    await expect(page).toHaveURL(/\/habit\/detail\?id=/);
    await page.getByRole('textbox').first().fill('Ler docs Zenith');
    await page.keyboard.press('Enter');
    await expect(page.locator('input').first()).toHaveValue('Ler docs Zenith');

    await page.getByLabel(/Apagar|Delete/i).click();
    await page.getByRole('dialog').getByRole('button', { name: /Apagar|Delete/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Ler docs Zenith')).toBeHidden();

    await expect(page.locator('#view-trash')).toBeVisible();
    await page.goto('/trash', { waitUntil: 'commit', timeout: 10_000 });
    await expect(page).toHaveURL(/\/trash/);
    await expect(page.getByText(/Ler docs Zenith|Ler documentação/)).toBeVisible();
    await page.getByLabel('Restaurar hábito').click();
    await expect(page.getByText('O lixo está vazio.')).toBeVisible();
  });
});
