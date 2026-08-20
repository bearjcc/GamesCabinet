export type SpriteAsset = {
  sheet: string;
  index: number;
  cols: number;
  rows: number;
};

export type SpriteStyle = {
  backgroundSize: string;
  backgroundPosition: string;
};

function percentage(value: number): string {
  return `${Number(value.toFixed(4))}%`;
}

function axisPosition(cell: number, cells: number): string {
  return percentage(cells === 1 ? 0 : (cell / (cells - 1)) * 100);
}

/** Convert a TTS atlas cell into CSS background positioning values. */
export function spriteStyle(asset: SpriteAsset): SpriteStyle {
  if (
    !Number.isInteger(asset.cols) ||
    !Number.isInteger(asset.rows) ||
    asset.cols < 1 ||
    asset.rows < 1
  ) {
    throw new Error(
      `Sprite atlas dimensions must be positive integers: ${asset.cols}x${asset.rows}`,
    );
  }
  if (!Number.isInteger(asset.index) || asset.index < 0 || asset.index >= asset.cols * asset.rows) {
    throw new Error(`Sprite index ${asset.index} is outside a ${asset.cols}x${asset.rows} atlas`);
  }

  const column = asset.index % asset.cols;
  const row = Math.floor(asset.index / asset.cols);
  return {
    backgroundSize: `${asset.cols * 100}% ${asset.rows * 100}%`,
    backgroundPosition: `${axisPosition(column, asset.cols)} ${axisPosition(row, asset.rows)}`,
  };
}
