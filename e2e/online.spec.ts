import { expect, type Page, test } from '@playwright/test';
import {
  fillRoomCode,
  openGameFromHome,
  openJoinPanel,
  openOnlinePair,
  pickHogwartsHero,
  readRoomCode,
  setTableSeatKind,
} from './helpers';

async function playCrazyEightsTurn(page: Page) {
  const playable = page.locator('.tt-hand button.is-playable');
  if ((await playable.count()) > 0) {
    await playable.first().click();
    const suit = page.getByTestId('ce-suit-hearts');
    if (await suit.isVisible().catch(() => false)) {
      await suit.click();
    }
    return;
  }
  await page.getByTestId('ce-stock-draw').click();
  if ((await playable.count()) > 0) {
    await playable.first().click();
    const suit = page.getByTestId('ce-suit-hearts');
    if (await suit.isVisible().catch(() => false)) {
      await suit.click();
    }
    return;
  }
  await page.getByTestId('ce-pass').click();
}

test.describe('GamesCabinet smokes', () => {
  test('host room and second player joins via deep link', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await openGameFromHome(hostPage, 'tic-tac-toe');
    await setTableSeatKind(hostPage, 0, 'online');
    await setTableSeatKind(hostPage, 1, 'online');
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

  test('host keeps this table and an online seat for a guest', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await openGameFromHome(hostPage, 'tic-tac-toe');
    await setTableSeatKind(hostPage, 1, 'online');
    await hostPage.getByTestId('host-room').click();
    await expect(hostPage.getByTestId('waiting-panel')).toBeVisible();
    const code = await readRoomCode(hostPage);

    await guestPage.goto(`/g/tic-tac-toe/${code}`);
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage.getByTestId('ttt-board')).toBeVisible();
    await expect(hostPage.getByTestId('ttt-board')).toBeVisible();

    await hostPage.getByTestId('ttt-cell-0').click();
    await expect(guestPage.getByTestId('ttt-cell-0')).toHaveAttribute('data-mark', 'X');

    await close();
  });

  test('two at this table plus an online seat reach the board', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await openGameFromHome(hostPage, 'crazy-eights');
    await setTableSeatKind(hostPage, 2, 'online');
    await hostPage.getByTestId('host-room').click();
    await expect(hostPage.getByTestId('waiting-panel')).toBeVisible();
    const code = await readRoomCode(hostPage);

    await guestPage.goto(`/g/crazy-eights/${code}`);
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage.getByTestId('ce-board')).toBeVisible();
    await expect(hostPage.getByTestId('ce-board')).toBeVisible();

    await close();
  });

  test('host keeps a bot seat and an online seat for a guest', async ({ browser }) => {
    test.setTimeout(90_000);
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await openGameFromHome(hostPage, 'crazy-eights');
    await setTableSeatKind(hostPage, 1, 'bot');
    await setTableSeatKind(hostPage, 2, 'online');
    await hostPage.getByTestId('host-room').click();
    await expect(hostPage.getByTestId('waiting-panel')).toBeVisible();
    const code = await readRoomCode(hostPage);

    await guestPage.goto(`/g/crazy-eights/${code}`);
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();
    await expect(guestPage.getByTestId('ce-board')).toBeVisible();
    await expect(hostPage.getByTestId('ce-board')).toBeVisible();

    await playCrazyEightsTurn(hostPage);
    await expect(guestPage.getByTestId('game-shell-turn-plate')).toContainText(/'s turn/i, {
      timeout: 30_000,
    });

    await close();
  });

  test('host room and guest joins via home code entry', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await openGameFromHome(hostPage, 'connect-four');
    await setTableSeatKind(hostPage, 0, 'online');
    await setTableSeatKind(hostPage, 1, 'online');
    await hostPage.getByTestId('host-room').click();
    const code = await readRoomCode(hostPage);

    await guestPage.addInitScript(() => {
      localStorage.setItem('gamescabinet.nickname', 'Guest');
    });
    await guestPage.goto('/');
    await openJoinPanel(guestPage);
    await fillRoomCode(guestPage, code);
    await guestPage.getByTestId('header-join').getByTestId('join-room').click();
    await expect(guestPage).toHaveURL(new RegExp(`/g/connect-four/${code}`, 'i'));
    await expect(guestPage.getByTestId('c4-board')).toBeVisible();

    await close();
  });

  test('yatzy host and guest join online', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await openGameFromHome(hostPage, 'yatzy');
    await setTableSeatKind(hostPage, 0, 'online');
    await setTableSeatKind(hostPage, 1, 'online');
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

  test('unlocked Hogwarts Battle hosts an unlisted configured room', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);
    const unlock = () => {
      localStorage.setItem('gamescabinet.unlockedGames', '["hogwarts-battle"]');
    };
    await hostPage.addInitScript(unlock);
    await guestPage.addInitScript(unlock);

    await hostPage.goto('/game/hogwarts-battle');
    await hostPage.getByTestId('hogwarts-year-7').click();
    await setTableSeatKind(hostPage, 1, 'local');
    await pickHogwartsHero(hostPage, 0, 'Neville Longbottom');
    await pickHogwartsHero(hostPage, 1, 'Harry Potter');
    await setTableSeatKind(hostPage, 0, 'online');
    await setTableSeatKind(hostPage, 1, 'online');
    await hostPage.getByTestId('host-room').click();
    await expect(hostPage.getByTestId('waiting-panel')).toBeVisible();
    const code = await readRoomCode(hostPage);

    await guestPage.goto(`/g/hogwarts-battle/${code}`);
    await guestPage.getByLabel('Your name').fill('Guest');
    await guestPage.getByTestId('join-room').click();

    await expect(hostPage.getByTestId('hb-meta')).toContainText('Game 7');
    await expect(hostPage.getByTestId('hb-hero-0')).toContainText('Neville Longbottom');
    await expect(hostPage.getByTestId('hb-hero-1')).toContainText('Harry Potter');
    await close();
  });

  test('online rematch after a finished tic-tac-toe game', async ({ browser }) => {
    const { hostPage, guestPage, close } = await openOnlinePair(browser);

    await openGameFromHome(hostPage, 'tic-tac-toe');
    await setTableSeatKind(hostPage, 0, 'online');
    await setTableSeatKind(hostPage, 1, 'online');
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
