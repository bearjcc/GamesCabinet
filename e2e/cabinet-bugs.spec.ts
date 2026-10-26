import { expect, test } from '@playwright/test';
import { setTableSeatKind } from './helpers';

test.describe('first-minute fixes', () => {
  test('klondike tableau fits inside the board on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/play/klondike?seats=1');
    const board = page.getByTestId('klondike-board');
    const tableau = page.getByTestId('klondike-tableau');
    await expect(board).toBeVisible();
    const boardBox = await board.boundingBox();
    const tableauBox = await tableau.boundingBox();
    expect(boardBox).not.toBeNull();
    expect(tableauBox).not.toBeNull();
    expect(tableauBox!.height).toBeGreaterThan(180);
    expect(tableauBox!.y + tableauBox!.height).toBeLessThanOrEqual(
      boardBox!.y + boardBox!.height + 2,
    );
  });

  test('connect four names the seat colour on the turn line', async ({ page }) => {
    await page.goto('/vs-bot/connect-four');
    await expect(page.getByRole('status')).toContainText(/'s turn$/);
    await expect(page.getByRole('status')).not.toContainText(/Player 1/);
    await expect(page.getByRole('status')).not.toContainText(/Yellow's turn/);
  });

  test('yatzy vs bot uses a named turn, not Player 1', async ({ page }) => {
    await page.goto('/vs-bot/yatzy');
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('status')).not.toContainText(/Player 1/);
    await expect(page.getByRole('status')).toMatchText(/'s turn/);
  });

  test('tracks draft shows distinct objective choices', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-tracks').click();
    await setTableSeatKind(page, 1, 'bot');
    await page.getByTestId('play-start').click();
    await expect(page.getByRole('heading', { name: /draft an objective/i })).toBeVisible();
    const cards = page.locator('.tracks-objective-card');
    await expect(cards).toHaveCount(2);
    const names = await cards.allTextContents();
    expect(new Set(names.map((t) => t.trim())).size).toBe(2);
  });
});
