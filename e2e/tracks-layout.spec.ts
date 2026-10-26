import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 1280, height: 800, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet-portrait' },
  { width: 1180, height: 820, name: 'tablet-landscape', minCell: 100 },
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

type LayoutMetrics = {
  frameMarginDelta: number;
  boardBottom: number;
  pewTop: number;
  startRailDelta: number;
  endRailDelta: number;
};

async function measureLayout(
  page: import('@playwright/test').Page,
  viewportWidth: number,
): Promise<LayoutMetrics> {
  return page.evaluate((vw) => {
    const frame = document.querySelector('[data-testid="tracks-board-frame"]');
    const pew = document.querySelector('[data-testid="tracks-pew"]');
    const playTable = document.querySelector('[data-testid="play-table"]');
    const startBuffer = document.querySelector(
      '[data-testid="tracks-terminal-start"] .tracks-terminal__buffer',
    );
    const endBuffer = document.querySelector(
      '[data-testid="tracks-terminal-end"] .tracks-terminal__buffer',
    );
    if (!frame || !pew || !playTable || !startBuffer || !endBuffer) {
      throw new Error('TRACKS layout nodes missing');
    }
    const cellPx = Number(playTable.getAttribute('data-tracks-cell-px') ?? 0);
    const grid = document.querySelector('[data-testid="tracks-board"]');
    if (!grid) throw new Error('TRACKS grid missing');
    const frameBox = frame.getBoundingClientRect();
    const hint = document.querySelector('[data-testid="tracks-hint"]');
    const stackBottom = hint
      ? hint.getBoundingClientRect().bottom
      : grid.getBoundingClientRect().bottom;
    const pewBox = pew.getBoundingClientRect();
    const midY = frameBox.top + 1.5 * cellPx;
    const startBox = startBuffer.getBoundingClientRect();
    const endBox = endBuffer.getBoundingClientRect();
    const startCenterY = startBox.top + startBox.height / 2;
    const endCenterY = endBox.top + endBox.height / 2;
    const leftMargin = frameBox.left;
    const rightMargin = vw - frameBox.right;
    return {
      frameMarginDelta: Math.abs(leftMargin - rightMargin),
      boardBottom: stackBottom,
      pewTop: pewBox.top,
      startRailDelta: Math.abs(startCenterY - midY),
      endRailDelta: Math.abs(endCenterY - midY),
    };
  }, viewportWidth);
}

for (const viewport of VIEWPORTS) {
  test.describe(`TRACKS grass layout ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    test('fits the viewport in solo play', async ({ page }) => {
      await reachTracksPlay(page);
      await expect(page.getByTestId('tracks-board')).toBeVisible();
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      );

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

      const metrics = await measureLayout(page, viewport.width);
      expect(metrics.frameMarginDelta).toBeLessThanOrEqual(4);
      expect(metrics.boardBottom).toBeLessThanOrEqual(metrics.pewTop + 1);
      expect(metrics.startRailDelta).toBeLessThanOrEqual(2);
      expect(metrics.endRailDelta).toBeLessThanOrEqual(2);

      await expectNoPageScroll(page);
    });
  });
}
