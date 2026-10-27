/**
 * Cabinet #28 review screenshots at three viewports.
 * Requires: npm run build && PORT=8000 npx tsx server/index.ts
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT = '/cursor/stores/self/cabinet/28';
const PORT = Number(process.env.CAPTURE_PORT) || 8000;
const base = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '390x844', width: 390, height: 844 },
] as const;

type Shot = {
  file: string;
  run: (page: Page) => Promise<void>;
};

async function unlockTracks(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks","hogwarts-battle"]');
  });
}

async function playConnectFourInProgress(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.nickname', 'You');
  });
  await page.goto(`${base}/vs-bot/connect-four?kinds=local,bot`);
  await page.getByTestId('c4-board').waitFor();
  const columns = [0, 1, 2, 3, 0, 1];
  for (const col of columns) {
    const target = page.getByTestId(`c4-col-${col}`);
    if (!(await target.isEnabled({ timeout: 1500 }).catch(() => false))) {
      await page.waitForTimeout(500);
      continue;
    }
    await target.hover();
    await target.click();
    await page.waitForTimeout(700);
    const discs = await page.locator('[data-testid^="c4-disc-"]').count();
    if (discs >= 6) break;
  }
  if (
    await page
      .getByTestId('match-status')
      .isVisible()
      .catch(() => false)
  ) {
    await page.goto(`${base}/vs-bot/connect-four?kinds=local,bot`);
    await page.getByTestId('c4-board').waitFor();
    for (const col of [0, 1, 2, 0, 1, 2]) {
      const target = page.getByTestId(`c4-col-${col}`);
      if (await target.isEnabled({ timeout: 1500 }).catch(() => false)) {
        await target.hover();
        await target.click();
        await page.waitForTimeout(600);
      }
      if ((await page.locator('[data-testid^="c4-disc-"]').count()) >= 5) break;
    }
  }
  for (const col of [3, 2, 4, 3]) {
    const target = page.getByTestId(`c4-col-${col}`);
    if (await target.isEnabled({ timeout: 500 }).catch(() => false)) {
      await target.hover();
      break;
    }
  }
}

async function draftTracksPlayer(page: Page) {
  await page.getByTestId('tracks-draft').locator('button').first().click();
  const handoff = page.getByTestId('tracks-handoff-ready');
  if (await handoff.isVisible().catch(() => false)) {
    await handoff.click();
  }
}

async function playTracksInProgress(page: Page) {
  await unlockTracks(page);
  await page.goto(`${base}/play/tracks?seats=3&names=Bear,Ana,Kit&discard=2021&junction=1`);
  for (let step = 0; step < 24; step++) {
    if (
      await page
        .getByTestId('tracks-grass-field')
        .isVisible()
        .catch(() => false)
    )
      break;
    if (
      await page
        .getByTestId('tracks-draft')
        .isVisible()
        .catch(() => false)
    ) {
      await draftTracksPlayer(page);
      continue;
    }
    const ready = page.getByTestId('tracks-handoff-ready');
    if (await ready.isVisible().catch(() => false)) {
      await ready.click();
      continue;
    }
    await page.waitForTimeout(200);
  }
  await page.getByTestId('tracks-grass-field').waitFor();
  for (let round = 0; round < 30; round++) {
    const handoff = page.getByTestId('tracks-handoff-ready');
    if (await handoff.isVisible().catch(() => false)) {
      await handoff.click();
      await page.waitForTimeout(200);
      continue;
    }
    const deck = page.getByTestId('tracks-draw-deck');
    if (!(await deck.isEnabled().catch(() => false))) {
      await page.waitForTimeout(350);
      continue;
    }
    await deck.click();
    const hand = page.getByTestId('tracks-hand').locator('button').first();
    await hand.click();
    const legal = page.locator('.tracks-cell.is-legal').first();
    if (await legal.isVisible().catch(() => false)) {
      await legal.click();
    }
    const placed = await page.locator('.tracks-cell.is-filled').count();
    if (placed >= 4) break;
  }
  await page
    .getByTestId('game-shell-turn-plate')
    .waitFor({ timeout: 15_000 })
    .catch(() => undefined);
  const handBtn = page.getByTestId('tracks-hand').locator('button').first();
  if (await handBtn.isVisible().catch(() => false)) await handBtn.click();
}

async function playYatzyInProgress(page: Page) {
  await page.goto(`${base}/play/yatzy?seats=1`);
  await page.getByTestId('yatzy-dice').waitFor();
  await page.getByTestId('yatzy-die-0').waitFor();
  await page.getByTestId('yatzy-roll').click();
  await page.getByTestId('yatzy-die-0').click();
  await page.getByTestId('yatzy-die-1').click();
}

async function playKlondikeInProgress(page: Page) {
  await page.goto(`${base}/play/klondike?seats=1`);
  await page.getByTestId('klondike-board').waitFor();
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('klondike-stock').click();
    await page.waitForTimeout(120);
  }
  const wasteTop = page.locator('[data-testid="klondike-waste"] .tt-card').first();
  if (await wasteTop.isVisible().catch(() => false)) {
    await wasteTop.click();
  }
}

const shots: Shot[] = [
  {
    file: 'home',
    run: async (page) => {
      await page.goto(`${base}/`);
      await page.getByTestId('catalogue-group-solo').waitFor();
    },
  },
  {
    file: 'setup-connect-four',
    run: async (page) => {
      await page.goto(`${base}/game/connect-four`);
      await page.getByTestId('table-seat-0').waitFor();
    },
  },
  {
    file: 'play-connect-four',
    run: async (page) => {
      await playConnectFourInProgress(page);
    },
  },
  {
    file: 'play-tracks',
    run: async (page) => {
      await playTracksInProgress(page);
    },
  },
  {
    file: 'play-klondike',
    run: async (page) => {
      await playKlondikeInProgress(page);
    },
  },
  {
    file: 'play-yatzy',
    run: async (page) => {
      await playYatzyInProgress(page);
    },
  },
  {
    file: 'setup-hogwarts',
    run: async (page) => {
      await unlockTracks(page);
      await page.goto(`${base}/game/hogwarts-battle`);
      await page.getByTestId('hogwarts-year-1').waitFor();
    },
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
  });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    for (const shot of shots) {
      await shot.run(page);
      await page.waitForTimeout(300);
      const file = path.join(OUT, `${shot.file}-${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log('wrote', file);
    }
    await context.close();
  }

  await browser.close();
}

main();
