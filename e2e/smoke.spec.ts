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
  });

  test('letter-walker solo play reaches a playable board and scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-letter-walker').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('lw-board')).toBeVisible();
    await page.getByTestId('lw-row-left-0').click();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('lw-tab-scores').click();
    await expect(page.getByTestId('lw-scores')).toBeVisible();
  });

  test('2048 solo play reaches a playable board and scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-2048').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('g2048-board')).toBeVisible();
    await page.getByTestId('g2048-left').click();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('g2048-tab-scores').click();
    await expect(page.getByTestId('g2048-scores')).toBeVisible();
  });

  test('yatzy solo play can roll and open scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-yatzy').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('yatzy-dice')).toBeVisible();
    await page.getByTestId('yatzy-roll').click();
    await page.getByTestId('yatzy-score-chance').click();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('yatzy-tab-scores').click();
    await expect(page.getByTestId('yatzy-scores')).toBeVisible();
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

  test('yatzy play vs bot reaches a playable board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-yatzy').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('yatzy-dice')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('tic-tac-toe pass and play reaches a local board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-tic-tac-toe').click();
    await page.getByTestId('play-local').click();
    await expect(page.getByTestId('ttt-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
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

  test('host room and second player joins via deep link', async ({ browser }) => {
    const host = await browser.newContext();
    const guest = await browser.newContext();
    const hostPage = await host.newPage();
    const guestPage = await guest.newPage();

    await hostPage.goto('/');
    await hostPage.getByTestId('home-game-tic-tac-toe').click();
    await hostPage.getByTestId('host-room').click();
    await expect(hostPage.getByTestId('room-code')).toBeVisible();
    await expect(hostPage.getByTestId('waiting-panel')).toBeVisible();
    await expect(hostPage.getByTestId('ttt-board')).not.toBeVisible();
    const code = (await hostPage.getByTestId('room-code').innerText()).trim();
    expect(code.length).toBeGreaterThanOrEqual(4);

    await guestPage.goto(`/g/tic-tac-toe/${code}`);
    await expect(guestPage.getByTestId('join-room')).toBeVisible();
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage.getByTestId('room-code')).toHaveText(code);
    await expect(guestPage.getByTestId('ttt-board')).toBeVisible();
    await expect(hostPage.getByTestId('ttt-board')).toBeVisible();

    await host.close();
    await guest.close();
  });

  test('host room and guest joins via home code entry', async ({ browser }) => {
    const host = await browser.newContext();
    const guest = await browser.newContext();
    const hostPage = await host.newPage();
    const guestPage = await guest.newPage();

    await hostPage.goto('/');
    await hostPage.getByTestId('home-game-connect-four').click();
    await hostPage.getByTestId('host-room').click();
    const code = (await hostPage.getByTestId('room-code').innerText()).trim();

    await guestPage.goto('/');
    await guestPage.getByTestId('join-code').fill(code);
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage).toHaveURL(new RegExp(`/g/connect-four/${code}`, 'i'));
    await expect(guestPage.getByTestId('c4-board')).toBeVisible();

    await host.close();
    await guest.close();
  });

  test('yatzy host and guest join online', async ({ browser }) => {
    const host = await browser.newContext();
    const guest = await browser.newContext();
    const hostPage = await host.newPage();
    const guestPage = await guest.newPage();

    await hostPage.goto('/');
    await hostPage.getByTestId('home-game-yatzy').click();
    await hostPage.getByTestId('party-size').selectOption('2');
    await hostPage.getByTestId('host-room').click();
    const code = (await hostPage.getByTestId('room-code').innerText()).trim();
    await expect(hostPage.getByTestId('waiting-panel')).toBeVisible();
    await expect(hostPage.getByTestId('yatzy-dice')).not.toBeVisible();

    await guestPage.goto(`/g/yatzy/${code}`);
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage.getByTestId('yatzy-dice')).toBeVisible();
    await expect(hostPage.getByTestId('yatzy-dice')).toBeVisible();

    await host.close();
    await guest.close();
  });

  test('online rematch after a finished tic-tac-toe game', async ({ browser }) => {
    const host = await browser.newContext();
    const guest = await browser.newContext();
    const hostPage = await host.newPage();
    const guestPage = await guest.newPage();

    await hostPage.goto('/');
    await hostPage.getByTestId('home-game-tic-tac-toe').click();
    await hostPage.getByTestId('host-room').click();
    const code = (await hostPage.getByTestId('room-code').innerText()).trim();

    await guestPage.goto(`/g/tic-tac-toe/${code}`);
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage.getByTestId('ttt-board')).toBeVisible();

    // Host is X (seat 0). Force a quick host win: 0,1,2 across top while guest plays elsewhere.
    await hostPage.getByTestId('ttt-cell-0').click();
    await guestPage.getByTestId('ttt-cell-3').click();
    await hostPage.getByTestId('ttt-cell-1').click();
    await guestPage.getByTestId('ttt-cell-4').click();
    await hostPage.getByTestId('ttt-cell-2').click();

    await expect(hostPage.getByTestId('match-action-again')).toBeVisible();
    await hostPage.getByTestId('match-action-again').click();
    await expect(hostPage).not.toHaveURL(new RegExp(`/g/tic-tac-toe/${code}$`, 'i'));
    const nextCode = (await hostPage.getByTestId('room-code').innerText()).trim();
    expect(nextCode.length).toBeGreaterThanOrEqual(4);
    expect(nextCode).not.toBe(code);

    await guestPage.getByTestId('match-action-again').click();
    await expect(guestPage).toHaveURL(new RegExp(`/g/tic-tac-toe/${nextCode}$`, 'i'));
    await expect(guestPage.getByTestId('ttt-board')).toBeVisible();

    await host.close();
    await guest.close();
  });
});
