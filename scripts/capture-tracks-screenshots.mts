/**
 * TRACKS review screenshots: grass board at desktop + tablet viewports.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT = '/opt/cursor/artifacts/tracks-grass-board';
const PORT = Number(process.env.CAPTURE_PORT) || 8770;
const base = `http://127.0.0.1:${PORT}`;

/** Connected demo on 8x3 board (row, col, asset key, rotation). */
const DEMO: { row: number; col: number; key: string; rot: number }[] = [
  { row: 1, col: 1, key: 'straight', rot: 1 },
  { row: 1, col: 2, key: 'curve', rot: 2 },
  { row: 1, col: 3, key: 'junction', rot: 0 },
  { row: 0, col: 3, key: 'straight', rot: 0 },
  { row: 1, col: 4, key: 'straight', rot: 1 },
  { row: 1, col: 5, key: 'whistlestop', rot: 0 },
  { row: 2, col: 5, key: 'straight', rot: 0 },
  { row: 1, col: 6, key: 'tunnel-arch', rot: 0 },
  { row: 2, col: 1, key: 'bridge-start', rot: 0 },
  { row: 2, col: 2, key: 'bridge-mid', rot: 0 },
  { row: 2, col: 3, key: 'tunnel-mid', rot: 0 },
  { row: 0, col: 6, key: 'obstacle-river', rot: 0 },
  { row: 0, col: 7, key: 'obstacle-mountain', rot: 0 },
];

const LEGAL_EMPTY: { row: number; col: number }[] = [
  { row: 1, col: 0 },
  { row: 2, col: 4 },
  { row: 0, col: 4 },
];

async function startServer(cwd: string): Promise<{ kill: () => void }> {
  const { spawn } = await import('node:child_process');
  const child = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 3000));
  return { kill: () => child.kill() };
}

async function openTracksSolo(page: Page) {
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks"]');
  });
  await page.goto(`${base}/game/tracks`);
  await page.getByTestId('play-start').click();
  await page.getByTestId('tracks-draft').locator('button').first().click();
  await page.getByTestId('tracks-play-surface').waitFor();
  await page.getByTestId('tracks-draw-deck').click();
}

async function fillDemoBoard(page: Page) {
  for (const p of DEMO) {
    const cell = page.getByTestId(`tracks-cell-${p.row}-${p.col}`);
    await cell.evaluate(
      (el, { key, rot }) => {
        el.classList.add('is-filled');
        const wrap = document.createElement('div');
        wrap.className = 'tracks-tile-wrap';
        wrap.style.transform = `rotate(${rot * 90}deg)`;
        wrap.style.width = '100%';
        wrap.style.height = '100%';
        const img = document.createElement('img');
        img.className = 'tracks-tile tracks-tile--photo';
        img.src = `/assets/tracks/512/${key}.webp`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        wrap.appendChild(img);
        el.appendChild(wrap);
      },
      { key: p.key, rot: p.rot },
    );
  }
  for (const { row, col } of LEGAL_EMPTY) {
    await page.getByTestId(`tracks-cell-${row}-${col}`).evaluate((el) => {
      el.classList.add('is-legal');
    });
  }
  const firstHand = page.getByTestId('tracks-hand').locator('button').first();
  await firstHand.evaluate((el) => {
    el.classList.add('is-selected');
  });
}

async function measureLayout(page: Page, viewportWidth: number) {
  return page.evaluate((vw) => {
    const frame = document.querySelector('[data-testid="tracks-board-frame"]');
    const pew = document.querySelector('[data-testid="tracks-pew"]');
    const playTable = document.querySelector('[data-testid="play-table"]');
    const grid = document.querySelector('[data-testid="tracks-board"]');
    const startTrack = document.querySelector('[data-testid="tracks-terminal-start-track"]');
    const endTrack = document.querySelector('[data-testid="tracks-terminal-end-track"]');
    const col1 = document.querySelector('[data-testid="tracks-cell-1-0"]');
    const col8 = document.querySelector('[data-testid="tracks-cell-1-7"]');
    const hint = document.querySelector('[data-testid="tracks-hint"]');
    if (!frame || !pew || !playTable || !grid || !startTrack || !endTrack || !col1 || !col8) {
      throw new Error('TRACKS layout nodes missing');
    }
    const cellPx = Number(playTable.getAttribute('data-tracks-cell-px') ?? 0);
    const frameBox = frame.getBoundingClientRect();
    const stackBottom = hint
      ? hint.getBoundingClientRect().bottom
      : grid.getBoundingClientRect().bottom;
    const pewBox = pew.getBoundingClientRect();
    const midCell = col1.getBoundingClientRect();
    const midCenterY = midCell.top + midCell.height / 2;
    const startBox = startTrack.getBoundingClientRect();
    const endBox = endTrack.getBoundingClientRect();
    const col1Box = col1.getBoundingClientRect();
    const col8Box = col8.getBoundingClientRect();
    const leftMargin = frameBox.left;
    const rightMargin = vw - frameBox.right;
    return {
      cellPx,
      frameMarginDelta: Math.abs(leftMargin - rightMargin),
      boardBottom: stackBottom,
      pewTop: pewBox.top,
      boardPewGap: pewBox.top - stackBottom,
      startRailDelta: Math.abs(startBox.top + startBox.height / 2 - midCenterY),
      endRailDelta: Math.abs(endBox.top + endBox.height / 2 - midCenterY),
      startGutterGap: startBox.right - col1Box.left,
      endGutterGap: col8Box.right - endBox.left,
    };
  }, viewportWidth);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const layoutMetrics: Record<string, unknown> = {};
  const root = path.resolve(import.meta.dirname, '..');
  const server = await startServer(root);
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    channel: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? undefined : 'chrome',
  });

  try {
    for (const [name, viewport] of [
      ['desktop-1280x800', { width: 1280, height: 800 }],
      ['tablet-portrait-820x1180', { width: 820, height: 1180 }],
      ['tablet-landscape-1180x820', { width: 1180, height: 820 }],
    ] as const) {
      const page = await browser.newPage({ viewport });
      await openTracksSolo(page);
      await fillDemoBoard(page);
      await page.waitForTimeout(300);
      layoutMetrics[name] = await measureLayout(page, viewport.width);
      const shot = await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
      if (!shot) throw new Error('screenshot failed');
      const meta = await page.viewportSize();
      if (meta?.width !== viewport.width || meta?.height !== viewport.height) {
        throw new Error(`viewport mismatch ${meta?.width}x${meta?.height}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  writeFileSync(path.join(OUT, 'layout-metrics.json'), JSON.stringify(layoutMetrics, null, 2));
  console.log('Wrote review artifacts to', OUT);
  console.log(JSON.stringify(layoutMetrics, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
