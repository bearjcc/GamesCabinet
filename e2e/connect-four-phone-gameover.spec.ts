import { expect, test } from '@playwright/test';

test.describe('Connect Four phone game-over tray', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('game-over tray sits above the phone bottom bar', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gamescabinet.nickname', 'You');
    });
    await page.goto('/vs-bot/connect-four?kinds=local,bot&colours=0,2');
    await page.getByTestId('c4-board').waitFor();

    const overlay = page.getByTestId('match-chrome-overlay');
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await overlay.isVisible().catch(() => false)) break;
      for (const col of [0, 1, 2, 3, 4, 5, 6]) {
        const target = page.getByTestId(`c4-col-${col}`);
        if (!(await target.isEnabled({ timeout: 300 }).catch(() => false))) continue;
        await target.click();
        await page.waitForTimeout(450);
        if (await overlay.isVisible().catch(() => false)) break;
      }
    }

    await expect(overlay).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('game-shell-bottom-bar')).toBeVisible();

    const layout = await page.evaluate(() => {
      const tray = document.querySelector('[data-testid="match-chrome-overlay"]');
      const bar = document.querySelector('[data-testid="game-shell-bottom-bar"]');
      const strip = document.querySelector('[data-testid="game-shell-end-strip"]');
      if (!tray || !bar) return null;
      const t = tray.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      const s = strip?.getBoundingClientRect();
      return {
        trayBottom: t.bottom,
        barTop: b.top,
        stripBottom: s?.bottom ?? t.bottom,
      };
    });

    expect(layout).not.toBeNull();
    expect(layout!.trayBottom).toBeLessThanOrEqual(layout!.barTop + 2);
    expect(layout!.stripBottom).toBeLessThanOrEqual(layout!.barTop + 2);
  });
});
