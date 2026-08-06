import { expect, test } from '@playwright/test';

test.describe('GamesCabinet smokes', () => {
  test('home lists Phase 1 games', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-game-tic-tac-toe')).toBeVisible();
    await expect(page.getByTestId('home-game-connect-four')).toBeVisible();
    await expect(page.getByTestId('home-game-checkers')).toBeVisible();
    await expect(page.getByTestId('home-game-dominoes')).toBeVisible();
    await expect(page.getByTestId('home-game-2048')).toBeVisible();
    await expect(page.getByTestId('home-game-yatzy')).toBeVisible();
    await expect(page.getByTestId('home-game-letter-walker')).toBeVisible();
    await expect(page.getByTestId('home-game-crazy-eights')).toBeVisible();
    await expect(page.getByTestId('home-game-reversi')).toBeVisible();
    await expect(page.getByTestId('home-game-memory')).toBeVisible();
    await expect(page.getByTestId('home-game-mancala')).toBeVisible();
    await expect(page.getByTestId('home-game-klondike')).toBeVisible();
    await expect(page.getByTestId('home-game-freecell')).toBeVisible();
    await expect(page.getByTestId('home-game-go')).toBeVisible();
    await expect(page.getByTestId('home-game-chinese-checkers')).toBeVisible();
    await expect(page.getByTestId('home-game-battleship')).toBeVisible();
    await expect(page.getByTestId('home-game-chess')).toBeVisible();
    await expect(page.getByTestId('home-game-nine-mens-morris')).toBeVisible();
    await expect(page.getByTestId('home-game-backgammon')).toBeVisible();
    await expect(page.getByTestId('home-game-dots-and-boxes')).toBeVisible();
    await expect(page.getByTestId('home-game-snakes-and-ladders')).toBeVisible();
    await expect(page.getByTestId('home-game-go-fish')).toBeVisible();
  });

  test('motion preference cycles from the shell', async ({ page }) => {
    await page.goto('/');
    const motion = page.getByTestId('motion-cycle');
    await expect(motion).toBeVisible();
    const before = await motion.innerText();
    await motion.click();
    await expect(motion).not.toHaveText(before);
  });

  test('invalid vs-bot route redirects to game modes', async ({ page }) => {
    await page.goto('/vs-bot/2048');
    await expect(page).toHaveURL(/\/game\/2048$/);
    await expect(page.getByTestId('play-solo')).toBeVisible();
  });

  test('bad room code shows a clear error', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('join-code').fill('ZZZZZZ');
    await page.getByTestId('join-room').click();
    await expect(page.locator('.error')).toContainText(/No room with that code/i);
  });
});
