import { expect, test } from '@playwright/test';

test.describe('GamesCabinet smokes', () => {
  test('letter-walker solo play reaches a playable board and scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-letter-walker').click();
    await expect(page).toHaveURL(/\/play\/letter-walker/);
    await expect(page.getByTestId('lw-board')).toBeVisible();
    await page.getByTestId('lw-cell-0-0').click();
    await expect(page.getByTestId('game-shell-quiet-hint')).toBeVisible();
    await page.getByTestId('game-shell-action-scores').click();
    await expect(page.getByTestId('lw-scores')).toBeVisible();
  });

  test('2048 solo play reaches a playable board and scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-2048').click();
    await expect(page).toHaveURL(/\/play\/2048/);
    await expect(page.getByTestId('g2048-board')).toBeVisible();
    await expect(page.getByTestId('g2048-best')).toBeVisible();

    await page.getByTestId('g2048-board').click();
    const before = await page.getByTestId('g2048-board').innerText();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'd']) {
      await page.keyboard.press(key);
      const after = await page.getByTestId('g2048-board').innerText();
      if (after !== before) break;
    }
    await expect.poll(async () => page.getByTestId('g2048-board').innerText()).not.toBe(before);
    await expect(page.getByTestId('g2048-score')).toBeVisible();

    await page.getByTestId('game-shell-action-rules').click();
    const rulesSheet = page.getByTestId('game-shell-rules-sheet');
    await expect(rulesSheet).toBeVisible();
    await expect(rulesSheet.getByTestId('g2048-help')).toBeVisible();

    await page.getByTestId('game-shell-action-scores').click();
    await expect(page.getByTestId('g2048-scores')).toBeVisible();
  });

  test('yatzy solo play can roll and open scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-yatzy').click();
    await page.getByTestId('play-start').click();
    await expect(page.getByTestId('yatzy-dice')).toBeVisible();
    await page.getByTestId('yatzy-roll').click();
    await page.getByTestId('yatzy-score-chance').click();
    await expect(page.getByTestId('game-shell-quiet-hint')).toBeVisible();
    await page.getByTestId('game-shell-action-scores').click();
    await expect(page.getByTestId('yatzy-scores')).toBeVisible();
  });

  test('klondike solo play reaches a playable board and scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-klondike').click();
    await expect(page).toHaveURL(/\/play\/klondike/);
    await expect(page.getByTestId('klondike-board')).toBeVisible();
    await expect(page.getByTestId('game-shell-quiet-hint')).toBeVisible();
    await page.getByTestId('game-shell-action-scores').click();
    await expect(page.getByTestId('klondike-scores')).toBeVisible();
  });
});
