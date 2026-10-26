import { expect, test } from '@playwright/test';
import { setTableSeatKind } from './helpers';

test.describe('first-minute fixes', () => {
  test('klondike tableau fits inside the board on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/play/klondike?seats=1');
    await expect(page.getByTestId('klondike-board')).toBeVisible();
    const tableauHeight = await page.evaluate(() => {
      const tableau = document.querySelector('[data-testid="klondike-tableau"]');
      return tableau?.getBoundingClientRect().height ?? 0;
    });
    expect(tableauHeight).toBeGreaterThan(180);
  });

  test('connect four names the seat colour on the turn line', async ({ page }) => {
    await page.goto('/vs-bot/connect-four');
    const plate = page.getByTestId('game-shell-turn-plate');
    await expect(plate).toContainText(/'s turn/);
    await expect(plate).not.toContainText(/Player 1/);
    await expect(plate).not.toContainText(/Yellow's turn/);
  });

  test('yatzy vs bot uses a named turn, not Player 1', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-yatzy').click();
    await setTableSeatKind(page, 1, 'bot');
    await page.getByTestId('play-start').click();
    const status = page.locator('.status').first();
    await expect(status).toBeVisible();
    await expect(status).not.toContainText(/Player 1/);
    await expect(status).toHaveText(/'s turn/);
  });

  test('tracks draft shows distinct objective choices', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gamescabinet.unlockedGames', '["tracks"]');
    });
    await page.goto('/play/tracks?seats=1');
    await expect(page.getByTestId('tracks-draft')).toBeVisible();
    const cards = page.getByTestId('tracks-draft').locator('button');
    await expect(cards).toHaveCount(2);
    const names = await cards.allTextContents();
    expect(new Set(names.map((t) => t.trim())).size).toBe(2);
  });
});
