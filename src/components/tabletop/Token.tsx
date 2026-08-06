export type TokenPlayer = '0' | '1' | string;
export type TokenVariant = 'disc' | 'chip' | 'pawn';
export type TokenSize = 'sm' | 'md' | 'lg';

export type TokenProps = {
  player: TokenPlayer;
  variant?: TokenVariant;
  size?: TokenSize;
  selected?: boolean;
  label?: string;
  testId?: string;
  /** Optional art override (slot). CSS shape is the default; Kenney art is never required. */
  assetSrc?: string | null;
};

function playerClass(player: string): string {
  return /^[0-9]+$/.test(player) ? `tt-token--p${player}` : 'tt-token--p0';
}

/**
 * Presentation slot for board discs / chips / pawns.
 * Default look is a CSS shape; pass `assetSrc` to override art without forking.
 * Cinematic seam: `data-primitive="drop"` - boards must not import Motion.
 */
export function Token({
  player,
  variant = 'disc',
  size = 'md',
  selected = false,
  label,
  testId,
  assetSrc,
}: TokenProps) {
  const className = [
    'tt-token',
    `tt-token--${variant}`,
    `tt-token--${size}`,
    playerClass(player),
    selected ? 'is-selected' : '',
    assetSrc ? 'tt-token--art' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (label) {
    return (
      <span
        className={className}
        role="img"
        aria-label={label}
        data-testid={testId}
        data-player={player}
        data-primitive="drop"
      >
        {assetSrc ? (
          <img className="tt-token__img" src={assetSrc} alt="" draggable={false} />
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={className}
      aria-hidden
      data-testid={testId}
      data-player={player}
      data-primitive="drop"
    >
      {assetSrc ? <img className="tt-token__img" src={assetSrc} alt="" draggable={false} /> : null}
    </span>
  );
}
