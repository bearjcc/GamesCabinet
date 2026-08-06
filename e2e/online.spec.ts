import { expect, test } from '@playwright/test';
import { openOnlinePair, readRoomCode } from './helpers';

test.describe('GamesCabinet smokes', () => {
  test('host room and second player joins via deep link', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await hostPage.goto('/');
    await hostPage.getByTestId('home-game-tic-tac-toe').click();
    await hostPage.getByTestId('host-room').click();
    await expect(hostPage.getByTestId('room-code')).toBeVisible();
    await expect(hostPage.getByTestId('waiting-panel')).toBeVisible();
    await expect(hostPage.getByTestId('ttt-board')).not.toBeVisible();
    const code = await readRoomCode(hostPage);
    expect(code.length).toBeGreaterThanOrEqual(4);

    await guestPage.goto(`/g/tic-tac-toe/${code}`);
    await expect(guestPage.getByTestId('join-room')).toBeVisible();
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage.getByTestId('room-code')).toHaveText(code);
    await expect(guestPage.getByTestId('ttt-board')).toBeVisible();
    await expect(hostPage.getByTestId('ttt-board')).toBeVisible();

    await close();
  });

  test('host room and guest joins via home code entry', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await hostPage.goto('/');
    await hostPage.getByTestId('home-game-connect-four').click();
    await hostPage.getByTestId('host-room').click();
    const code = await readRoomCode(hostPage);

    await guestPage.goto('/');
    await guestPage.getByTestId('join-code').fill(code);
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage).toHaveURL(new RegExp(`/g/connect-four/${code}`, 'i'));
    await expect(guestPage.getByTestId('c4-board')).toBeVisible();

    await close();
  });

  test('yatzy host and guest join online', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await hostPage.goto('/');
    await hostPage.getByTestId('home-game-yatzy').click();
    await hostPage.getByTestId('party-size').selectOption('2');
    await hostPage.getByTestId('host-room').click();
    const code = await readRoomCode(hostPage);
    await expect(hostPage.getByTestId('waiting-panel')).toBeVisible();
    await expect(hostPage.getByTestId('yatzy-dice')).not.toBeVisible();

    await guestPage.goto(`/g/yatzy/${code}`);
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage.getByTestId('yatzy-dice')).toBeVisible();
    await expect(hostPage.getByTestId('yatzy-dice')).toBeVisible();

    await close();
  });

  test('online rematch after a finished tic-tac-toe game', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await hostPage.goto('/');
    await hostPage.getByTestId('home-game-tic-tac-toe').click();
    await hostPage.getByTestId('host-room').click();
    const code = await readRoomCode(hostPage);

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
    const nextCode = await readRoomCode(hostPage);
    expect(nextCode.length).toBeGreaterThanOrEqual(4);
    expect(nextCode).not.toBe(code);

    await guestPage.getByTestId('match-action-again').click();
    await expect(guestPage).toHaveURL(new RegExp(`/g/tic-tac-toe/${nextCode}$`, 'i'));
    await expect(guestPage.getByTestId('ttt-board')).toBeVisible();

    await close();
  });
});
