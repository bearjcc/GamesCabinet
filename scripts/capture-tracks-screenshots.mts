/**
 * TRACKS art review screenshots (card sheet + demo board).
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
  await page.evaluate(() => {
    const placements: { row: number; col: number; key: string; rot: number }[] = [
      { row: 2, col: 2, key: 'straight', rot: 0 },
      { row: 2, col: 3, key: 'curve', rot: 0 },
      { row: 2, col: 4, key: 'junction', rot: 0 },
      { row: 3, col: 2, key: 'tunnel-arch', rot: 0 },
      { row: 3, col: 3, key: 'tunnel-mid', rot: 0 },
      { row: 3, col: 4, key: 'bridge-start', rot: 0 },
      { row: 4, col: 2, key: 'bridge-mid', rot: 0 },
      { row: 4, col: 3, key: 'whistlestop', rot: 0 },
      { row: 4, col: 4, key: 'obstacle-river', rot: 0 },
      { row: 5, col: 3, key: 'obstacle-mountain', rot: 0 },
    ];
    for (const p of placements) {
      const cell = document.querySelector(`[data-testid="tracks-cell-${p.row}-${p.col}"]`);
      if (!cell) continue;
      cell.classList.add('is-filled');
      const wrap = document.createElement('div');
      wrap.className = 'tracks-tile-wrap';
      wrap.style.transform = `rotate(${p.rot * 90}deg)`;
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      const img = document.createElement('img');
      img.className = 'tracks-tile tracks-tile--photo';
      img.src = `/assets/tracks/512/${p.key}.webp`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      wrap.appendChild(img);
      cell.appendChild(wrap);
    }
  });
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
    const sheet = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    const tiles = CARDS
      .map(
        (c) =>
          `<figure><img src="/assets/tracks/1024/${c.key}.webp" width="280" height="280" alt=""/><figcaption>${c.label}</figcaption></figure>`,
      )
      .join('');
    await sheet.setContent(
      `<!doctype html><html><head><style>
      body{font-family:system-ui;margin:16px;background:#1a3310;color:#f5f5f5}
      .grid{display:grid;grid-template-columns:repeat(5,280px);gap:16px}
      figure{margin:0;text-align:center;font-size:13px}
      img{border-radius:10px;display:block}
      </style></head><body><h1>TRACKS card sheet (280px)</h1><div class="grid">${tiles}</div></body></html>`,
    );
    await sheet.waitForTimeout(500);
    await sheet.screenshot({ path: path.join(OUT, 'card-sheet-280.png'), fullPage: true });
    await sheet.close();

    for (const [name, viewport] of [
      ['desktop-demo-board', { width: 1280, height: 800 }],
      ['tablet-demo-board', { width: 820, height: 1180 }],
    ] as const) {
      const page = await browser.newPage({ viewport });
      await openTracksSolo(page);
      await fillDemoBoard(page);
      await page.locator('.play-table').screenshot({ path: path.join(OUT, `${name}.png`) });
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
