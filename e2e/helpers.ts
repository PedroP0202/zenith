import { expect, type Page } from '@playwright/test';

const apiPattern = /https:\/\/zenith-api\.zenith-pedro\.workers\.dev\/.*/;

export async function mockZenithApi(page: Page) {
  await page.route(apiPattern, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/auth/login') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'e2e-token',
          user: {
            id: 'user-1',
            name: 'E2E User',
            email: 'e2e@example.com',
            language: 'pt',
            username: 'e2e',
            optInLeaderboard: true,
            total_xp: 0,
            level: 1,
            arena_points: 0,
            lastLoginRewardDate: new Date().toISOString().slice(0, 10),
          },
        }),
      });
    }

    if (path === '/sync/pull') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          habits: [],
          logs: [],
          timestamp: Date.now(),
          user: {
            total_xp: 0,
            level: 1,
            arena_points: 0,
            lastLoginRewardDate: new Date().toISOString().slice(0, 10),
          },
        }),
      });
    }

    if (path === '/sync/push' || path === '/auth/profile' || path === '/beta/feedback') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }

    if (path === '/friends') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ friends: [{ id: 'friend-1', name: 'Ana', username: 'ana', score: 4 }] }),
      });
    }

    if (path === '/friends/requests') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          incoming: [{ id: 'request-1', from_id: 'user-2', name: 'Luis', username: 'luis', created_at: Date.now() }],
          outgoing: [],
        }),
      });
    }

    if (path === '/users/search') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ id: 'user-3', name: 'Mia', username: 'mia' }] }),
      });
    }

    if (path === '/friends/request') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }

    if (path === '/leaderboard') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          leaderboard: [{ id: 'user-1', name: 'E2E User', username: 'e2e', score: 0 }],
          type: 'seasonal',
          season: { id: 'season', name: 'Arena Maio 2026', startsAt: Date.now(), endsAt: Date.now() + 86_400_000 },
          meta: { participantsCount: 1, topScore: 0, averageScore: 0 },
          me: null,
        }),
      });
    }

    if (path === '/users/me/rewards') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }

    if (path === '/friends/blocked') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ blocked: [] }) });
    }

    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

export async function login(page: Page) {
  await mockZenithApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('zenith_beta_welcome_seen', 'true');
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill('e2e@example.com');
  await page.locator('#login-password').fill('password1');
  await page.getByRole('button', { name: /Entrar e Sincronizar/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('E2E User')).toBeVisible();
  const skipOnboarding = page.getByRole('button', { name: /Saltar|Skip/i });
  if (await skipOnboarding.isVisible().catch(() => false)) {
    await skipOnboarding.click({ force: true, timeout: 2_000 }).catch(() => undefined);
  }
}
