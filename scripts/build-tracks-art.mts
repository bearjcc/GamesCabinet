/**
 * One-off builder: composites Bear's GIMP exports into square TRACKS card WebPs.
 * Run: npx tsx scripts/build-tracks-art.mts
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const UPLOADS = path.resolve(
  process.env.TRACKS_ART_SRC ?? '/home/ubuntu/.cursor/projects/workspace/uploads/extracted',
);
const OUT = path.join(ROOT, 'public', 'assets', 'tracks');

const CARD = 2160;
/** Track centreline X for N–S straight edges (fraction of card width). */
const TRACK_X = 0.5;

const SRC = {
  grass: path.join(UPLOADS, 'tunnel-bg/f1-QVA/layer05_GRASS_copy.png'),
  tunnelArch: path.join(UPLOADS, 'tunnel-variants/f1-QVA/v_tunnel_start.png'),
  tunnelMidTall: path.join(UPLOADS, 'tunnel-variants/f1-QVA/v_tunnel_mid_tall.png'),
  cartoonBg: path.join(UPLOADS, 'straight-cartoon/f2-8PR/layer03_background.png'),
  cartoonGravel: path.join(UPLOADS, 'straight-cartoon/f2-8PR/layer02_Pasted_Layer.png'),
  cartoonTracks: path.join(UPLOADS, 'straight-cartoon/f2-8PR/layer00_tracks.png'),
  tunnelMidFlat: path.join(UPLOADS, 'tunnel-a/f1-QVA/flat.png'),
} as const;

async function grassSquare(): Promise<Buffer> {
  return sharp(SRC.grass).resize(CARD, CARD, { fit: 'cover', position: 'centre' }).png().toBuffer();
}

async function opaqueBBox(
  input: string,
  threshold = 8,
): Promise<{ left: number; top: number; width: number; height: number } | null> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * 4 + 3];
      if (a > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function extractTrackStrip(): Promise<{ strip: Buffer; trackCentreY: number }> {
  const bbox = await opaqueBBox(SRC.cartoonTracks);
  if (!bbox) throw new Error('tracks layer has no opaque pixels');
  const strip = await sharp(SRC.cartoonTracks).extract(bbox).png().toBuffer();
  const trackCentreY = bbox.top + bbox.height / 2;
  return { strip, trackCentreY };
}

async function buildStraightVertical(): Promise<Buffer> {
  const grass = await grassSquare();
  const { strip } = await extractTrackStrip();
  const vertical = await sharp(strip).rotate(90).png().toBuffer();
  const vMeta = await sharp(vertical).metadata();
  const vW = vMeta.width ?? CARD;
  const gravelBBox = await opaqueBBox(SRC.cartoonGravel);
  if (!gravelBBox) throw new Error('gravel layer empty');
  const gravelStrip = await sharp(SRC.cartoonGravel)
    .extract(gravelBBox)
    .resize(Math.round(CARD * 0.42), CARD, { fit: 'fill' })
    .png()
    .toBuffer();

  const trackPlaced = await sharp(vertical)
    .resize({
      width: Math.max(vW, CARD),
      height: CARD,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const trackMeta = await sharp(trackPlaced).metadata();
  const tw = trackMeta.width ?? CARD;
  const gravelW = Math.round(CARD * 0.42);

  return sharp(grass)
    .composite([
      { input: gravelStrip, left: Math.round(CARD * TRACK_X - gravelW / 2), top: 0 },
      {
        input: trackPlaced,
        left: Math.round(CARD * TRACK_X - tw / 2),
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}

async function buildCurveNe(): Promise<Buffer> {
  const grass = await grassSquare();
  const { strip } = await extractTrackStrip();
  const stripMeta = await sharp(strip).metadata();
  const sleeperSpacing = Math.max(12, Math.round((stripMeta.width ?? 400) / 18));
  const railGap = Math.round((stripMeta.height ?? 80) * 0.35);
  const cx = Math.round(CARD * TRACK_X);
  const cy = cx;
  const r = Math.round(CARD * 0.46);

  const sleepers: string[] = [];
  const rails: string[] = [];
  for (let deg = 0; deg <= 90; deg += 2) {
    const rad = (deg * Math.PI) / 180;
    const x = cx + r * Math.sin(rad);
    const y = cy - r * Math.cos(rad);
    const rot = deg + 90;
    sleepers.push(
      `<rect x="${x - sleeperSpacing / 2}" y="${y - 6}" width="${sleeperSpacing}" height="12" rx="2" fill="#c46a2a" transform="rotate(${rot} ${x} ${y})"/>`,
    );
  }
  const arcPath = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  rails.push(
    `<path d="${arcPath}" fill="none" stroke="#e8e4dc" stroke-width="14" stroke-linecap="round"/>`,
  );
  rails.push(
    `<path d="${arcPath}" fill="none" stroke="#e8e4dc" stroke-width="14" stroke-linecap="round" transform="translate(0 ${railGap})"/>`,
  );

  const gravelSvg = `<svg width="${CARD}" height="${CARD}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${cx} ${cy}) rotate(90) scale(${r})">
        <stop offset="0" stop-color="#9a8f7a" stop-opacity="0.95"/>
        <stop offset="0.55" stop-color="#8a7f6c" stop-opacity="0.85"/>
        <stop offset="1" stop-color="#8a7f6c" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${CARD}" height="${CARD}" fill="url(#g)"/>
  </svg>`;

  const trackSvg = `<svg width="${CARD}" height="${CARD}" xmlns="http://www.w3.org/2000/svg">
    ${sleepers.join('\n')}
    ${rails.join('\n')}
  </svg>`;

  const gravelBuf = await sharp(Buffer.from(gravelSvg)).png().toBuffer();
  const trackBuf = await sharp(Buffer.from(trackSvg)).png().toBuffer();

  return sharp(grass)
    .composite([
      { input: gravelBuf, left: 0, top: 0 },
      { input: trackBuf, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function pickTunnelMidSlice(): Promise<Buffer> {
  const tallMeta = await sharp(SRC.tunnelMidTall).metadata();
  const tallH = tallMeta.height ?? CARD;
  const slices = Math.floor(tallH / CARD);
  let best = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  const flat = await sharp(SRC.tunnelMidFlat).resize(CARD, CARD).raw().toBuffer();
  for (let i = 0; i < slices; i++) {
    const slice = await sharp(SRC.tunnelMidTall)
      .extract({ left: 0, top: i * CARD, width: CARD, height: CARD })
      .resize(CARD, CARD)
      .raw()
      .toBuffer();
    let diff = 0;
    for (let p = 0; p < flat.length; p += 4) {
      diff +=
        Math.abs(flat[p] - slice[p]) +
        Math.abs(flat[p + 1] - slice[p + 1]) +
        Math.abs(flat[p + 2] - slice[p + 2]);
    }
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return sharp(SRC.tunnelMidTall)
    .extract({ left: 0, top: best * CARD, width: CARD, height: CARD })
    .png()
    .toBuffer();
}

async function writeSizes(name: string, png: Buffer) {
  for (const size of [512, 1024]) {
    const dir = path.join(OUT, String(size));
    fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, `${name}.webp`);
    await sharp(png).resize(size, size).webp({ quality: 82, effort: 6 }).toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`${outPath} (${Math.round(stat.size / 1024)} KiB)`);
  }
}

async function main() {
  for (const p of Object.values(SRC)) {
    if (!fs.existsSync(p)) {
      console.error('Missing source:', p);
      console.error('Set TRACKS_ART_SRC to extracted uploads folder.');
      process.exit(1);
    }
  }

  fs.mkdirSync(OUT, { recursive: true });

  const tunnelArch = await sharp(SRC.tunnelArch)
    .resize(CARD, CARD, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
  const tunnelMid = await pickTunnelMidSlice();
  const straight = await buildStraightVertical();
  const curve = await buildCurveNe();

  const tiles: Record<string, Buffer> = {
    'tunnel-arch': tunnelArch,
    'tunnel-mid': tunnelMid,
    straight,
    curve,
  };

  for (const [name, buf] of Object.entries(tiles)) {
    await writeSizes(name, buf);
  }

  await sharp(SRC.grass)
    .resize(512, 512)
    .webp({ quality: 80 })
    .toFile(path.join(OUT, '512', 'grass.webp'));
  await sharp(SRC.grass)
    .resize(1024, 1024)
    .webp({ quality: 80 })
    .toFile(path.join(OUT, '1024', 'grass.webp'));
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
