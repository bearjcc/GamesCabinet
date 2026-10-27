import { expect, test } from '@playwright/test';

test('Connect Four game-over actions sit below the board, not over seat chips', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.nickname', 'You');
  });
  await page.goto('/vs-bot/connect-four?kinds=local,bot');
  await page.getByTestId('c4-board').waitFor();

  for (let attempt = 0; attempt < 40; attempt++) {
    const overlay = page.getByTestId('match-chrome-overlay');
    if (await overlay.isVisible().catch(() => false)) break;

    for (const col of [0, 1, 2, 3, 4, 5, 6]) {
      const target = page.getByTestId(`c4-col-${col}`);
      if (!(await target.isEnabled({ timeout: 300 }).catch(() => false))) continue;
      await target.click();
      await page.waitForTimeout(450);
      if (await overlay.isVisible().catch(() => false)) break;
    }
  }

  await expect(page.getByTestId('match-chrome-overlay')).toBeVisible({ timeout: 60_000 });

  const layout = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="match-chrome-overlay"]');
    const chips = document.querySelector('.game-shell-stage__under');
    const board = document.querySelector('[data-testid="c4-board"]');
    if (!overlay || !chips || !board) return null;
    const o = overlay.getBoundingClientRect();
    const c = chips.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    return {
      overlayTop: o.top,
      chipsBottom: c.bottom,
      boardBottom: b.bottom,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout!.overlayTop).toBeGreaterThanOrEqual(layout!.chipsBottom - 2);
  expect(layout!.overlayTop).toBeGreaterThanOrEqual(layout!.boardBottom - 2);
});
