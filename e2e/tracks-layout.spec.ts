import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 1280, height: 800, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet-portrait' },
  { width: 1180, height: 820, name: 'tablet-landscape', minCell: 100 },
  { width: 390, height: 844, name: 'phone' },
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
  await page.goto('/game/tracks?seats=1');
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
  startGutterGap: number;
  endGutterGap: number;
  maxCellOverlapPx: number;
};

async function measureLayout(
  page: import('@playwright/test').Page,
  viewportWidth: number,
): Promise<LayoutMetrics> {
  return page.evaluate((vw) => {
    const frame = document.querySelector('[data-testid="tracks-board-frame"]');
    const pew = document.querySelector('[data-testid="tracks-pew"]');
    const startTrack = document.querySelector('[data-testid="tracks-terminal-start-track"]');
    const endTrack = document.querySelector('[data-testid="tracks-terminal-end-track"]');
    const col1 = document.querySelector('[data-testid="tracks-cell-1-0"]');
    const col8 = document.querySelector('[data-testid="tracks-cell-1-7"]');
    if (!frame || !pew || !startTrack || !endTrack || !col1 || !col8) {
      throw new Error('TRACKS layout nodes missing');
    }
    const grid = document.querySelector('[data-testid="tracks-board"]');
    if (!grid) throw new Error('TRACKS grid missing');
    const frameBox = frame.getBoundingClientRect();
    const hint = document.querySelector('[data-testid="tracks-hint"]');
    const stackBottom = hint
      ? hint.getBoundingClientRect().bottom
      : grid.getBoundingClientRect().bottom;
    const pewBox = pew.getBoundingClientRect();
    const midCell = col1.getBoundingClientRect();
    const midCenterY = midCell.top + midCell.height / 2;
    const startBox = startTrack.getBoundingClientRect();
    const endBox = endTrack.getBoundingClientRect();
    const startCenterY = startBox.top + startBox.height / 2;
    const endCenterY = endBox.top + endBox.height / 2;
    const col1Box = col1.getBoundingClientRect();
    const col8Box = col8.getBoundingClientRect();
    const leftMargin = frameBox.left;
    const rightMargin = vw - frameBox.right;
    let maxCellOverlapPx = 0;
    for (const cell of document.querySelectorAll('[data-testid^="tracks-cell-"]')) {
      const overlap = cell.getBoundingClientRect().bottom - pewBox.top;
      if (overlap > maxCellOverlapPx) maxCellOverlapPx = overlap;
    }
    return {
      frameMarginDelta: Math.abs(leftMargin - rightMargin),
      boardBottom: stackBottom,
      pewTop: pewBox.top,
      startRailDelta: Math.abs(startCenterY - midCenterY),
      endRailDelta: Math.abs(endCenterY - midCenterY),
      startGutterGap: startBox.right - col1Box.left,
      endGutterGap: col8Box.right - endBox.left,
      maxCellOverlapPx,
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
      if (viewport.name !== 'phone') {
        expect(grassFillsHeight).toBe(true);
      }

      const cellBox = await page.getByTestId('tracks-cell-1-1').boundingBox();
      expect(cellBox).not.toBeNull();
      const cellPx = await page.getByTestId('game-shell').getAttribute('data-tracks-cell-px');
      if ('minCell' in viewport && viewport.minCell) {
        expect(Number(cellPx)).toBeGreaterThanOrEqual(viewport.minCell);
        expect(cellBox!.width).toBeGreaterThanOrEqual(viewport.minCell);
      }

      const handImg = page.locator('.tracks-hand__card img').first();
      await expect(handImg).toBeVisible();
      const imgBox = await handImg.boundingBox();
      expect(imgBox).not.toBeNull();
      const cell = Number(cellPx);
      if (viewport.width <= 640) {
        expect(imgBox!.width).toBeGreaterThanOrEqual(64);
        const hand = page.getByTestId('tracks-hand');
        const handBox = await hand.boundingBox();
        expect(handBox).not.toBeNull();
        const visibleCards = await page.locator('.tracks-hand__card').evaluateAll((cards) => {
          const handEl = cards[0]?.closest('[data-testid="tracks-hand"]');
          if (!handEl) return 0;
          const clip = handEl.getBoundingClientRect();
          return cards.filter((card) => {
            const b = card.getBoundingClientRect();
            const visibleW = Math.min(b.right, clip.right) - Math.max(b.left, clip.left);
            return visibleW >= b.width * 0.85;
          }).length;
        });
        expect(visibleCards).toBeGreaterThanOrEqual(3);
        const piles = page.locator('.tracks-shell-tray__piles');
        const pilesBox = await piles.boundingBox();
        expect(pilesBox).not.toBeNull();
        expect(pilesBox!.width).toBeLessThanOrEqual(52);
      } else {
        expect(imgBox!.width).toBeGreaterThanOrEqual(cell * 0.75 - 1);
      }

      if (viewport.name !== 'phone') {
        const metrics = await measureLayout(page, viewport.width);
        expect(metrics.frameMarginDelta).toBeLessThanOrEqual(4);
        expect(metrics.boardBottom).toBeLessThanOrEqual(metrics.pewTop + 1);
        expect(metrics.maxCellOverlapPx).toBeLessThanOrEqual(1);
        expect(metrics.startRailDelta).toBeLessThanOrEqual(2);
        expect(metrics.endRailDelta).toBeLessThanOrEqual(2);
        expect(metrics.startGutterGap).toBeLessThanOrEqual(1);
        expect(metrics.endGutterGap).toBeLessThanOrEqual(1);
      }

      await expectNoPageScroll(page);
    });
  });
}
