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
