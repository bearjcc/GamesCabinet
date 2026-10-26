import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 1280, height: 800, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet-portrait' },
  { width: 1180, height: 820, name: 'tablet-landscape', minCell: 110 },
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
  await expect(page.getByTestId('tracks-board')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('tracks-grass-field')).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test.describe(`TRACKS grass layout ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    test('fits the viewport in solo play', async ({ page }) => {
      await reachTracksPlay(page);
      await expect(page.getByTestId('tracks-board')).toBeVisible();

      const grass = page.getByTestId('tracks-grass-field');
      await expect(grass).toBeVisible();
      const grassBox = await grass.boundingBox();
      expect(grassBox).not.toBeNull();
      expect(grassBox!.x).toBeLessThanOrEqual(1);
      expect(grassBox!.width).toBeGreaterThanOrEqual(viewport.width - 2);
      const grassFillsHeight = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="tracks-grass-field"]');
        if (!el) return false;
        return el.getBoundingClientRect().bottom >= document.documentElement.clientHeight - 2;
      });
      expect(grassFillsHeight).toBe(true);

      const cellBox = await page.getByTestId('tracks-cell-1-1').boundingBox();
      expect(cellBox).not.toBeNull();
      const cellPx = await page.getByTestId('play-table').getAttribute('data-tracks-cell-px');
      if ('minCell' in viewport && viewport.minCell) {
        expect(Number(cellPx)).toBeGreaterThanOrEqual(viewport.minCell);
        expect(cellBox!.width).toBeGreaterThanOrEqual(viewport.minCell);
      }

      await expectNoPageScroll(page);
    });
  });
}
