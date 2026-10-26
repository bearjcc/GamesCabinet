import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 1280, height: 800, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet-portrait' },
  { width: 1180, height: 820, name: 'tablet-landscape' },
] as const;

async function expectNoPageScroll(page: import('@playwright/test').Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
}

async function reachTracksPlay(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks"]');
  });
  await page.goto('/game/tracks');
  await page.getByTestId('play-start').click();
  await page.getByTestId('tracks-draft').locator('button').first().click();
  await expect(page.getByTestId('tracks-play-surface')).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test.describe(`TRACKS grass layout ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    test('fits the viewport in solo play', async ({ page }) => {
      await reachTracksPlay(page);
      await expect(page.getByTestId('tracks-board')).toBeVisible();
      await expectNoPageScroll(page);
    });
  });
}
