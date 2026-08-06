import { expect, test } from '@playwright/test';

test.describe('GamesCabinet smokes', () => {
  test('crazy-eights play vs bot reaches board and hand', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-crazy-eights').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('ce-board')).toBeVisible();
    await expect(page.getByTestId('ce-hand')).toBeVisible();
    await expect(page.getByTestId('ce-discard-top')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('tic-tac-toe play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-tic-tac-toe').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('ttt-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('tic-tac-toe vs bot play again keeps an opponent', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/vs-bot/tic-tac-toe');
    await expect(page.getByTestId('ttt-board')).toBeVisible();

    const again = page.getByTestId('match-action-again');
    const open = page.locator('[data-testid^="ttt-cell-"]:not([disabled])');
    for (let i = 0; i < 12; i++) {
      if (await again.isVisible().catch(() => false)) break;
      try {
        await open.first().click({ timeout: 15_000 });
      } catch {
        // Bot may finish the game while we wait for an open cell.
      }
    }

    await expect(again).toBeVisible({ timeout: 15_000 });
    await again.click();
    await expect(page.getByTestId('ttt-board')).toBeVisible();
    await expect(page.getByRole('status')).toContainText(/Your turn/i);

    await page.getByTestId('ttt-cell-4').click();
    await expect(page.getByRole('status')).toContainText(/Their turn/i);
    // While the bot thinks, human must not be able to fill every square.
    await expect(page.getByTestId('ttt-cell-0')).toBeDisabled();
    await expect(page.getByRole('status')).toContainText(/Your turn/i, { timeout: 15_000 });
    const botMarks = page.locator('[data-testid^="ttt-cell-"]', { hasText: 'O' });
    await expect(botMarks).toHaveCount(1);
  });

  test('connect-four play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-connect-four').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('c4-board')).toBeVisible();
    await page.getByTestId('c4-col-3').click();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('checkers play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-checkers').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('checkers-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('dominoes play vs bot reaches board and hand', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-dominoes').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('dom-board')).toBeVisible();
    await expect(page.getByTestId('dom-hand')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('dominoes exposes a selected starter and places a physical tile', async ({ page }) => {
    await page.goto('/vs-bot/dominoes');
    await expect(page.getByTestId('dom-starter')).toBeDisabled();
    await page.getByTestId('dom-hand-0').click();
    await expect(page.getByTestId('dom-starter')).toBeEnabled();
    await page.getByTestId('dom-starter').click();
    await expect(page.locator('.dom-placed')).toHaveCount(1);
  });

  test('yatzy play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-yatzy').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('yatzy-dice')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('reversi play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-reversi').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('reversi-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('memory play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-memory').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('memory-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('mancala play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-mancala').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('mancala-board')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /turn/i })).toBeVisible();
  });

  test('go play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-go').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('go-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });
});
