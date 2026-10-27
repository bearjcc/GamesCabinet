/**
 * Cabinet #28 review screenshots at three viewports.
 * Requires: npm run build && PORT=8000 npx tsx server/index.ts
 */
import { execSync } from 'node:child_process';
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
  await page.goto(`${base}/`);
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks","hogwarts-battle"]');
  });
}

async function ensureNicknameYou(page: Page) {
  await page.goto(`${base}/`);
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.nickname', 'You');
  });
}

async function countStartRowTrack(page: Page): Promise<number> {
  return page.evaluate(() => {
    let n = 0;
    for (let col = 0; col < 8; col++) {
      const cell = document.querySelector(`[data-testid="tracks-cell-1-${col}"]`);
      if (cell?.classList.contains('is-filled')) n++;
    }
    return n;
  });
}

async function playConnectFourMid(page: Page) {
  await ensureNicknameYou(page);
  await page.goto(`${base}/vs-bot/connect-four?kinds=local,bot`);
  await page.getByTestId('c4-board').waitFor();
  const pattern = [0, 1, 2, 1, 0, 2, 3, 2, 1, 3];
  for (const col of pattern) {
    const overlay = page.getByTestId('match-chrome-overlay');
    if (await overlay.isVisible().catch(() => false)) {
      await page.goto(`${base}/vs-bot/connect-four?kinds=local,bot`);
      await page.getByTestId('c4-board').waitFor();
    }
    const target = page.getByTestId(`c4-col-${col}`);
    if (!(await target.isEnabled({ timeout: 1500 }).catch(() => false))) {
      await page.waitForTimeout(400);
      continue;
    }
    await target.hover();
    await target.click();
    await page.waitForTimeout(650);
    const discs = await page.locator('[data-testid^="c4-disc-"]').count();
    if (discs >= 7 && discs <= 14) break;
    if (discs > 14) {
      await page.goto(`${base}/vs-bot/connect-four?kinds=local,bot`);
      await page.getByTestId('c4-board').waitFor();
    }
  }
  await page
    .getByTestId('match-chrome-overlay')
    .waitFor({ state: 'hidden', timeout: 5000 })
    .catch(() => undefined);
}

async function playConnectFourGameOver(page: Page) {
  await ensureNicknameYou(page);
  await page.goto(`${base}/vs-bot/connect-four?kinds=local,bot`);
  await page.getByTestId('c4-board').waitFor();

  for (let attempt = 0; attempt < 48; attempt++) {
    const overlay = page.getByTestId('match-chrome-overlay');
    if (await overlay.isVisible().catch(() => false)) return;

    for (const col of [0, 1, 2, 3, 4, 5, 6, 0, 1]) {
      const target = page.getByTestId(`c4-col-${col}`);
      if (!(await target.isEnabled({ timeout: 400 }).catch(() => false))) continue;
      await target.click();
      await page.waitForTimeout(500);
      if (await overlay.isVisible().catch(() => false)) return;
    }
  }
  await page
    .getByTestId('match-chrome-overlay')
    .waitFor({ timeout: 30_000 })
    .catch(() => undefined);
}

async function draftTracksPlayer(page: Page) {
  await page.getByTestId('tracks-draft').locator('button').first().click();
  const handoff = page.getByTestId('tracks-handoff-ready');
  if (await handoff.isVisible().catch(() => false)) {
    await handoff.click();
  }
}

async function dismissTracksHandoff(page: Page): Promise<boolean> {
  const ready = page.getByTestId('tracks-handoff-ready');
  if (await ready.isVisible().catch(() => false)) {
    await ready.click();
    await page.waitForTimeout(350);
    return true;
  }
  return false;
}

async function playTracksInProgress(page: Page) {
  await unlockTracks(page);
  await page.goto(`${base}/play/tracks?seats=3&names=Bear,Ana,Kit&discard=2021&junction=1`);
  const enterPlayDeadline = Date.now() + 55_000;
  while (Date.now() < enterPlayDeadline) {
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
    await dismissTracksHandoff(page);
    await page.waitForTimeout(250);
  }

  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    const onStart = await countStartRowTrack(page);
    if (onStart >= 5) break;

    await dismissTracksHandoff(page);
    if (
      await page
        .getByTestId('tracks-handoff')
        .isVisible()
        .catch(() => false)
    ) {
      await page.waitForTimeout(250);
      continue;
    }

    const deck = page.getByTestId('tracks-draw-deck');
    if (await deck.isEnabled().catch(() => false)) {
      await deck.click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(150);
    }

    const cards = page.getByTestId('tracks-hand').locator('button:not([disabled])');
    const cardCount = await cards.count();
    let progressed = false;
    for (let c = 0; c < cardCount; c++) {
      await cards
        .nth(c)
        .click({ timeout: 3000 })
        .catch(() => undefined);
      for (let spin = 0; spin < 4; spin++) {
        for (let col = 0; col < 8; col++) {
          const cell = page.getByTestId(`tracks-cell-1-${col}`);
          const cls = (await cell.getAttribute('class').catch(() => '')) ?? '';
          if (!cls.includes('is-legal')) continue;
          await cell.click({ timeout: 3000 }).catch(() => undefined);
          await page.waitForTimeout(220);
          if ((await countStartRowTrack(page)) > onStart) {
            progressed = true;
            break;
          }
        }
        if (progressed) break;
        await cards
          .nth(c)
          .click({ timeout: 2000 })
          .catch(() => undefined);
      }
      if (progressed) break;
    }

    if (!progressed) {
      const anyLegal = page.locator('.tracks-cell.is-legal').first();
      if (await anyLegal.isVisible().catch(() => false)) {
        await anyLegal.click({ timeout: 3000 }).catch(() => undefined);
      }
    }

    await page.waitForTimeout(350);
  }

  await page
    .getByTestId('game-shell-turn-plate')
    .waitFor({ timeout: 15_000 })
    .catch(() => undefined);
  const startTiles = await countStartRowTrack(page);
  if (startTiles < 4) {
    console.warn('tracks capture: only', startTiles, 'tiles on start row');
  }
}

async function playYatzyInProgress(page: Page) {
  await page.goto(`${base}/play/yatzy?seats=1`);
  await page.getByTestId('yatzy-dice').waitFor();
  await page.getByTestId('yatzy-die-0').waitFor();
  await page.getByTestId('yatzy-roll').click();
  await page.getByTestId('yatzy-die-0').click();
  await page.getByTestId('yatzy-die-1').click();
}

async function saveYatzyDieZoom(page: Page, viewportName: string) {
  const die = page.getByTestId('yatzy-die-2');
  const box = await die.boundingBox();
  if (!box) return;
  const pad = 4;
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
  const cropPath = path.join(OUT, `yatzy-die-crop-${viewportName}.png`);
  await page.screenshot({ path: cropPath, clip });
  const zoomPath = path.join(OUT, `yatzy-die-4x-${viewportName}.png`);
  execSync(
    `ffmpeg -y -i "${cropPath}" -vf scale=iw*4:ih*4:flags=neighbor -frames:v 1 "${zoomPath}"`,
    { stdio: 'ignore' },
  );
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
    file: 'play-connect-four-mid',
    run: async (page) => {
      await playConnectFourMid(page);
    },
  },
  {
    file: 'play-connect-four',
    run: async (page) => {
      await playConnectFourGameOver(page);
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
  console.log('capture-cabinet-28: starting');
  mkdirSync(OUT, { recursive: true });
  const only = process.env.CAPTURE_SHOTS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const selected = only?.length ? shots.filter((s) => only.includes(s.file)) : shots;
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
  });

  const viewportFilter = process.env.CAPTURE_VIEWPORT;
  const viewports = viewportFilter ? VIEWPORTS.filter((v) => v.name === viewportFilter) : VIEWPORTS;

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    for (const shot of selected) {
      await shot.run(page);
      await page.waitForTimeout(300);
      const file = path.join(OUT, `${shot.file}-${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log('wrote', file);
      if (shot.file === 'play-yatzy') {
        await saveYatzyDieZoom(page, viewport.name);
        console.log('wrote', path.join(OUT, `yatzy-die-crop-${viewport.name}.png`));
      }
    }
    await context.close();
  }

  await browser.close();
}

main();
