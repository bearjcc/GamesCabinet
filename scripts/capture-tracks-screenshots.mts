/**
 * TRACKS review screenshots: full viewport board + card sheet (loads assets from the dev server).
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT = '/opt/cursor/artifacts/tracks-art-v2';
const PORT = Number(process.env.CAPTURE_PORT) || 8770;
const base = `http://127.0.0.1:${PORT}`;

const CARDS: { key: string; label: string }[] = [
  { key: 'straight', label: 'straight' },
  { key: 'curve', label: 'curve' },
  { key: 'junction', label: 'junction' },
  { key: 'bridge-start', label: 'bridge-start' },
  { key: 'bridge-mid', label: 'bridge-mid' },
  { key: 'tunnel-arch', label: 'tunnel-arch' },
  { key: 'tunnel-mid', label: 'tunnel-mid' },
  { key: 'whistlestop', label: 'whistlestop' },
  { key: 'obstacle-river', label: 'obstacle river' },
  { key: 'obstacle-mountain', label: 'obstacle mountain' },
];

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

const HAND_KEYS = ['curve', 'junction', 'bridge-start', 'whistlestop', 'straight'];

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
        wrap.style.borderRadius = '6px';
        wrap.style.overflow = 'hidden';
        const img = document.createElement('img');
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
  const hand = page.getByTestId('tracks-hand');
  await hand.evaluate((el, keys) => {
    el.innerHTML = '';
    for (const key of keys) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tracks-hand__card';
      const wrap = document.createElement('div');
      wrap.className = 'tracks-tile-wrap';
      wrap.style.width = '4rem';
      wrap.style.height = '4rem';
      const img = document.createElement('img');
      img.src = `/assets/tracks/512/${key}.webp`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      wrap.appendChild(img);
      const label = document.createElement('span');
      label.textContent = key;
      btn.append(wrap, label);
      el.appendChild(btn);
    }
  }, HAND_KEYS);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const root = path.resolve(import.meta.dirname, '..');
  const server = await startServer(root);
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    channel: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? undefined : 'chrome',
  });

  try {
    const sheet = await browser.newPage({ viewport: { width: 1500, height: 1300 } });
    await sheet.goto(base);
    await sheet.evaluate((cards) => {
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(5, 280px)';
      grid.style.gap = '16px';
      grid.style.padding = '16px';
      grid.style.background = '#1a3310';
      for (const c of cards) {
        const fig = document.createElement('figure');
        fig.style.margin = '0';
        fig.style.textAlign = 'center';
        fig.style.color = '#f5f5f5';
        fig.style.fontSize = '13px';
        const img = document.createElement('img');
        img.src = `/assets/tracks/1024/${c.key}.webp`;
        img.width = 280;
        img.height = 280;
        img.style.borderRadius = '10px';
        img.style.display = 'block';
        const cap = document.createElement('figcaption');
        cap.textContent = c.label;
        fig.append(img, cap);
        grid.appendChild(fig);
      }
      document.body.innerHTML = '';
      document.body.appendChild(grid);
    }, CARDS);
    await sheet.waitForFunction(() =>
      [...document.querySelectorAll('img')].every((img) => (img as HTMLImageElement).complete),
    );
    await sheet.screenshot({ path: path.join(OUT, 'card-sheet-280.png'), fullPage: true });
    await sheet.close();

    for (const [name, viewport] of [
      ['desktop-demo-board-1280x800', { width: 1280, height: 800 }],
      ['tablet-demo-board-820x1180', { width: 820, height: 1180 }],
    ] as const) {
      const page = await browser.newPage({ viewport });
      await openTracksSolo(page);
      await fillDemoBoard(page);
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
  console.log('Wrote review artifacts to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
