import { expect, test } from '@playwright/test';
import { GAMES, isAccessGated, isSoloOnly, soloPlayPath } from '../src/lib/games';

const VIEWPORTS = [
  { width: 1280, height: 800, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet' },
] as const;

function gamePath(gameId: string): string {
  const meta = GAMES.find((game) => game.id === gameId);
  if (!meta) throw new Error(`Unknown game ${gameId}`);
  return isSoloOnly(meta) ? soloPlayPath(gameId) : `/game/${gameId}`;
}

const OPEN_GAME_PATHS = GAMES.filter((game) => !isAccessGated(game)).map((game) => ({
  id: game.id,
  path: gamePath(game.id),
}));

async function expectNoPageScroll(page: import('@playwright/test').Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
}

for (const viewport of VIEWPORTS) {
  test.describe(`no scroll at ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    test('home catalogue fits the viewport', async ({ page }) => {
      await page.goto('/');
      await expectNoPageScroll(page);
    });

    for (const { id, path } of OPEN_GAME_PATHS) {
      test(`game page ${id} fits the viewport`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('body')).toBeVisible();
        await expectNoPageScroll(page);
      });
    }
  });
}
