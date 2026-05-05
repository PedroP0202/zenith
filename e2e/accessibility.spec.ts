import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login, mockZenithApi } from './helpers';

const authenticatedPages = ['/', '/habit/new', '/friends', '/profile', '/leaderboard'];

test.describe('accessibility smoke checks', () => {
  test('login page has no critical axe violations', async ({ page }) => {
    await mockZenithApi(page);
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
  });

  for (const path of authenticatedPages) {
    test(`${path} has no critical axe violations`, async ({ page }) => {
      await login(page);
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast'])
        .analyze();

      expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
    });
  }
});
