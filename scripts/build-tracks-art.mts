/**
 * Composites Bear's TRACKS exports into square WebP card faces.
 * Run: npm run build:tracks-art
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
const CX = CARD / 2;

const SRC = {
  grass: path.join(UPLOADS, 'tunnel-bg/f1-QVA/layer05_GRASS_copy.png'),
  vStraight: path.join(UPLOADS, 'tunnel-variants/f1-QVA/v_straight.png'),
  vCurve: path.join(UPLOADS, 'tunnel-variants/f1-QVA/v_curve90.png'),
  tunnelArch: path.join(UPLOADS, 'tunnel-variants/f1-QVA/v_tunnel_start.png'),
  tunnelMidTall: path.join(UPLOADS, 'tunnel-variants/f1-QVA/v_tunnel_mid_tall.png'),
} as const;

type Mat = 'rail' | 'bridge' | 'tunnel';

/** Measured gravel+track centre in v_straight before re-centring. */
const V_STRAIGHT_TRACK_CX = 1426;

async function grassSquare(): Promise<Buffer> {
  return sharp(SRC.grass).resize(CARD, CARD, { fit: 'cover', position: 'centre' }).png().toBuffer();
}

async function reCenteredStraightSource(): Promise<Buffer> {
  const shift = Math.round(V_STRAIGHT_TRACK_CX - CX);
  const grass = await grassSquare();
  return sharp(grass)
    .composite([{ input: SRC.vStraight, left: -shift, top: 0 }])
    .png()
    .toBuffer();
}

/** Vertical track column (gravel + sleepers + rails) centred on CX. */
async function trackColumn(): Promise<{ strip: Buffer; width: number }> {
  const base = await reCenteredStraightSource();
  const colW = 340;
  const left = Math.round(CX - colW / 2);
  const strip = await sharp(base)
    .extract({ left, top: 0, width: colW, height: CARD })
    .png()
    .toBuffer();
  return { strip, width: colW };
}

async function tintStrip(strip: Buffer, mat: Mat): Promise<Buffer> {
  if (mat === 'rail') return strip;
  if (mat === 'bridge') {
    return sharp(strip)
      .modulate({ brightness: 1.05, saturation: 1.35 })
      .tint({ r: 232, g: 160, b: 74 })
      .png()
      .toBuffer();
  }
  return sharp(strip)
    .modulate({ brightness: 0.92, saturation: 0.75 })
    .tint({ r: 107, g: 90, b: 138 })
    .png()
    .toBuffer();
}

async function placeArm(
  canvas: Buffer,
  dir: 0 | 1 | 2 | 3,
  mat: Mat,
  col: Buffer,
  colW: number,
): Promise<Buffer> {
  const tinted = await tintStrip(col, mat);
  const half = Math.round(colW / 2);
  if (dir === 0 || dir === 2) {
    const top = dir === 0 ? 0 : CX;
    const height = dir === 0 ? CX : CX;
    const slice = await sharp(tinted)
      .extract({ left: 0, top, width: colW, height })
      .png()
      .toBuffer();
    return sharp(canvas)
      .composite([{ input: slice, left: Math.round(CX - half), top: dir === 0 ? 0 : CX }])
      .png()
      .toBuffer();
  }
  const rotated = await sharp(tinted)
    .rotate(90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const meta = await sharp(rotated).metadata();
  const rw = meta.width ?? CARD;
  const rh = meta.height ?? colW;
  const sliceW = CX;
  const slice = await sharp(rotated)
    .extract({
      left: dir === 1 ? 0 : rw - sliceW,
      top: Math.round(rh / 2 - half),
      width: sliceW,
      height: colW,
    })
    .png()
    .toBuffer();
  const left = dir === 1 ? CX : 0;
  const top = Math.round(CX - half);
  return sharp(canvas)
    .composite([{ input: slice, left, top }])
    .png()
    .toBuffer();
}

async function buildFromArms(arms: { dir: 0 | 1 | 2 | 3; mat: Mat }[]): Promise<Buffer> {
  const grass = await grassSquare();
  const { strip, width } = await trackColumn();
  let canvas = grass;
  for (const arm of arms) {
    canvas = await placeArm(canvas, arm.dir, arm.mat, strip, width);
  }
  return canvas;
}

async function buildStraight(): Promise<Buffer> {
  return reCenteredStraightSource();
}

async function buildCurveSimple(): Promise<Buffer> {
  const grass = await grassSquare();
  const bed = await sharp(SRC.vCurve).resize(CARD, CARD).png().toBuffer();
  const { strip, width } = await trackColumn();
  const chipH = Math.round(width * 0.52);
  const chip = await sharp(strip)
    .extract({ left: 0, top: Math.round(CX - chipH / 2), width, height: chipH })
    .png()
    .toBuffer();

  let trackLayer = await sharp(grass).png().toBuffer();
  const r = CX;
  for (let deg = 0; deg <= 90; deg += 2) {
    const rad = (deg * Math.PI) / 180;
    const x = CX + r * Math.sin(rad);
    const y = CX - r * Math.cos(rad);
    const piece = await sharp(chip)
      .rotate(deg + 90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const meta = await sharp(piece).metadata();
    const cw = meta.width ?? width;
    const ch = meta.height ?? chipH;
    trackLayer = await sharp(trackLayer)
      .composite([{ input: piece, left: Math.round(x - cw / 2), top: Math.round(y - ch / 2) }])
      .png()
      .toBuffer();
  }

  const arcMask = await sharp(SRC.vCurve)
    .resize(CARD, CARD)
    .ensureAlpha()
    .extractChannel('alpha')
    .blur(1.2)
    .png()
    .toBuffer();
  trackLayer = await sharp(trackLayer)
    .composite([{ input: arcMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(grass)
    .composite([
      { input: bed, top: 0, left: 0 },
      { input: trackLayer, top: 0, left: 0, blend: 'over' },
    ])
    .png()
    .toBuffer();
}

async function stripBakedScore(img: Buffer): Promise<Buffer> {
  const grass = await grassSquare();
  const patch = await sharp(grass)
    .extract({ left: 0, top: CARD - 640, width: 640, height: 640 })
    .png()
    .toBuffer();
  return sharp(img)
    .composite([{ input: patch, left: 0, top: CARD - 640 }])
    .png()
    .toBuffer();
}

async function pickTunnelMid(): Promise<Buffer> {
  return sharp(SRC.tunnelMidTall)
    .extract({ left: 0, top: CARD, width: CARD, height: CARD })
    .png()
    .toBuffer();
}

async function buildObstacle(variant: 'river' | 'mountain'): Promise<Buffer> {
  const grass = await grassSquare();
  const svg =
    variant === 'mountain'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD}" height="${CARD}">
        <path d="M ${CARD * 0.22} ${CARD * 0.82} L ${CX} ${CARD * 0.38} L ${CARD * 0.78} ${CARD * 0.82} Z" fill="#9a9a94" stroke="#6a6a64" stroke-width="8"/>
      </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD}" height="${CARD}">
        <path d="M ${CARD * 0.12} ${CARD * 0.42} Q ${CX * 0.7} ${CARD * 0.34} ${CX} ${CARD * 0.42} T ${CARD * 0.88} ${CARD * 0.42}" fill="none" stroke="#4a8fd4" stroke-width="28"/>
        <path d="M ${CARD * 0.12} ${CARD * 0.58} Q ${CX * 0.7} ${CARD * 0.5} ${CX} ${CARD * 0.58} T ${CARD * 0.88} ${CARD * 0.58}" fill="none" stroke="#4a8fd4" stroke-width="28"/>
      </svg>`;
  const art = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(grass)
    .composite([{ input: art, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

async function writeSizes(name: string, png: Buffer) {
  for (const size of [512, 1024] as const) {
    const dir = path.join(OUT, String(size));
    fs.mkdirSync(dir, { recursive: true });
    await sharp(png)
      .resize(size, size)
      .webp({ quality: 82, effort: 6 })
      .toFile(path.join(dir, `${name}.webp`));
  }
}

async function main() {
  for (const p of Object.values(SRC)) {
    if (!fs.existsSync(p)) {
      console.error('Missing', p);
      process.exit(1);
    }
  }
  fs.mkdirSync(OUT, { recursive: true });

  const straight = await buildStraight();
  const curve = await buildCurveSimple();

  const tunnelArch = await stripBakedScore(
    await sharp(SRC.tunnelArch)
      .resize(CARD, CARD, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer(),
  );
  const tunnelMid = await stripBakedScore(await pickTunnelMid());

  const tiles: Record<string, Buffer> = {
    straight,
    curve,
    'tunnel-arch': tunnelArch,
    'tunnel-mid': tunnelMid,
    junction: await buildFromArms([
      { dir: 0, mat: 'rail' },
      { dir: 1, mat: 'rail' },
      { dir: 3, mat: 'rail' },
    ]),
    'bridge-start': await buildFromArms([
      { dir: 1, mat: 'bridge' },
      { dir: 3, mat: 'rail' },
    ]),
    'bridge-mid': await buildFromArms([
      { dir: 1, mat: 'bridge' },
      { dir: 3, mat: 'bridge' },
    ]),
    whistlestop: await buildFromArms([
      { dir: 0, mat: 'rail' },
      { dir: 1, mat: 'rail' },
      { dir: 2, mat: 'rail' },
      { dir: 3, mat: 'rail' },
    ]),
    'obstacle-river': await buildObstacle('river'),
    'obstacle-mountain': await buildObstacle('mountain'),
  };

  const grass = await grassSquare();
  for (const [name, buf] of Object.entries(tiles)) {
    await writeSizes(name, buf);
  }
  for (const size of [512, 1024] as const) {
    await sharp(grass)
      .resize(size, size)
      .webp({ quality: 80 })
      .toFile(path.join(OUT, String(size), 'grass.webp'));
  }
  console.log('Built', Object.keys(tiles).length, 'tiles into', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
