import { expect, test } from '@playwright/test';

test.describe('GamesCabinet smokes', () => {
  test('home lists Phase 1 games in catalogue groups', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'GamesCabinet home' })).toBeVisible();
    await expect(page.getByTestId('catalogue-group-solo')).toBeVisible();
    await expect(page.getByTestId('catalogue-group-with-others')).toBeVisible();
    await expect(
      page.getByTestId('catalogue-group-solo').getByTestId('home-game-2048'),
    ).toBeVisible();
    await expect(
      page.getByTestId('catalogue-group-with-others').getByTestId('home-game-tic-tac-toe'),
    ).toBeVisible();
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
    await expect(page.getByTestId('home-game-nim')).toBeVisible();
    await expect(page.getByTestId('home-game-war')).toBeVisible();
  });

  test('motion preference cycles from the shell', async ({ page }) => {
    await page.goto('/');
    const motion = page.getByTestId('motion-cycle');
    await expect(motion).toBeVisible();
    const before = await motion.getAttribute('aria-label');
    await motion.click();
    await expect(motion).not.toHaveAttribute('aria-label', before ?? '');
  });

  test('game launch arranges seats around one start action', async ({ page }) => {
    await page.goto('/game/dominoes');
    await expect(page.getByTestId('launch-modes')).toBeVisible();
    await expect(page.getByTestId('table-seat-0')).toBeVisible();
    await expect(page.getByTestId('table-seat-1')).toBeVisible();
    await expect(page.getByTestId('play-start')).toBeEnabled();
    await expect(page.getByTestId('host-room')).toHaveCount(0);

    await page.getByTestId('table-seat-0-kind-online').click();
    await page.getByTestId('table-seat-1-kind-online').click();
    await expect(page.getByTestId('host-room')).toBeEnabled();
  });

  test('invalid vs-bot route redirects to solo play for 2048', async ({ page }) => {
    await page.goto('/vs-bot/2048');
    await expect(page).toHaveURL(/\/play\/2048$/);
    await expect(page.getByTestId('g2048-board')).toBeVisible();
  });

  test('hidden shelf stays locked until its access code is entered', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-game-orbits')).toHaveCount(0);

    await page.goto('/game/orbits');
    await expect(page.getByTestId('launch-locked')).toBeVisible();

    await page.getByTestId('unlock-code').fill('crawler');
    await page.getByTestId('unlock-submit').click();
    await expect(page).toHaveURL(/\/play\/orbits/);
    await expect(page.getByTestId('orbits-board')).toBeVisible();

    await page.goto('/');
    await expect(page.getByTestId('home-game-orbits')).toBeVisible();
  });

  test('wrong access code explains itself', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('unlock-code').fill('not-a-code');
    await page.getByTestId('unlock-submit').click();
    await expect(page.getByTestId('unlock-feedback')).toContainText(/does not open/i);
  });

  test('Hogwarts Battle shelf unlocks for local and online play', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-game-hogwarts-battle')).toHaveCount(0);

    await page.goto('/game/hogwarts-battle');
    await expect(page.getByTestId('launch-locked')).toBeVisible();
    await page.getByTestId('unlock-code').fill('LUNALOVEGOOD');
    await page.getByTestId('unlock-submit').click();
    await expect(page.getByTestId('play-start')).toBeVisible();
    await page.getByTestId('table-seat-1-kind-local').click();
    await page.getByTestId('hogwarts-year-7').click();

    await page.getByTestId('hogwarts-hero-0').selectOption('neville');
    await page.getByTestId('hogwarts-hero-1').selectOption('harry');
    await page.getByTestId('play-start').click();
    await expect(page).toHaveURL(/\/play\/hogwarts-battle/);
    await expect(page.getByTestId('hb-board')).toBeVisible();
    await expect(page.getByTestId('hb-hand')).toBeVisible();
    await expect(page.getByTestId('hb-meta')).toContainText('Game 7');
    await expect(page.getByTestId('hb-horcruxes')).toBeVisible();
  });

  test('Hogwarts year resets when switching games from the launch screen', async ({ page }) => {
    await page.goto('/game/hogwarts-battle');
    await page.getByTestId('unlock-code').fill('LUNALOVEGOOD');
    await page.getByTestId('unlock-submit').click();
    await page.getByTestId('hogwarts-year-7').click();
    await expect(page.getByTestId('hogwarts-year-7')).toHaveAttribute('aria-checked', 'true');

    await page.goto('/game/dominoes');
    await expect(page.getByTestId('launch-modes')).toBeVisible();

    await page.goto('/game/hogwarts-battle');
    await expect(page.getByTestId('hogwarts-year-1')).toHaveAttribute('aria-checked', 'true');
  });

  test('TRACKS shelf unlocks and drafts into a playable table', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-game-tracks')).toHaveCount(0);

    await page.goto('/game/tracks');
    await expect(page.getByTestId('launch-locked')).toBeVisible();
    await page.getByTestId('unlock-code').fill('CHOOCHOO');
    await page.getByTestId('unlock-submit').click();
    await expect(page.getByTestId('play-start')).toBeVisible();

    await page.getByTestId('play-start').click();
    await expect(page).toHaveURL(/\/play\/tracks/);
    await expect(page.getByTestId('tracks-draft')).toBeVisible();
    // Both seats draft an objective, then the table appears.
    await page.getByTestId('tracks-draft').locator('button').first().click();
    await page.getByTestId('tracks-draft').locator('button').first().click();
    await expect(page.getByTestId('tracks-board')).toBeVisible();
    await expect(page.getByTestId('tracks-draw-deck')).toBeVisible();
    await page.getByTestId('tracks-draw-deck').click();
    await expect(page.getByTestId('tracks-status')).toContainText(/play a card or discard/i);
  });

  test('bad room code shows a clear error', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('join-code').fill('ZZZZZZ');
    await page.getByTestId('join-room').click();
    await expect(page.locator('.error')).toContainText(/No room with that code/i);
  });
});
