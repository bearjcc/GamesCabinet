import type { CSSProperties } from 'react';
import { kenneyTokenGlyph } from '../../games/shared/tokens';
import { useSeatColourStyle } from '../SeatColours';

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
  /** Extra mark on top of the token (e.g. checkers crown). */
  badgeSrc?: string | null;
};

function playerClass(player: string): string {
  return /^[0-9]+$/.test(player) ? `tt-token--p${player}` : 'tt-token--p0';
}

/**
 * Presentation slot for board discs / chips / pawns.
 * Default look is a CSS shape; pawn/chip variants use a Kenney silhouette mask
 * so player colour still comes from CSS. Pass `assetSrc` to override art without forking.
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
  badgeSrc,
}: TokenProps) {
  const seatStyle = useSeatColourStyle(player);
  const glyphSrc = assetSrc ? null : kenneyTokenGlyph(variant);
  const className = [
    'tt-token',
    `tt-token--${variant}`,
    `tt-token--${size}`,
    playerClass(player),
    selected ? 'is-selected' : '',
    assetSrc ? 'tt-token--art' : '',
    glyphSrc ? 'tt-token--glyph' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style = {
    ...(seatStyle ?? {}),
    ...(glyphSrc ? { '--tt-token-glyph': `url("${glyphSrc}")` } : {}),
  } as CSSProperties;

  const inner = (
    <>
      {assetSrc ? <img className="tt-token__img" src={assetSrc} alt="" draggable={false} /> : null}
      {badgeSrc ? (
        <img className="tt-token__badge" src={badgeSrc} alt="" draggable={false} />
      ) : null}
    </>
  );

  if (label) {
    return (
      <span
        className={className}
        style={style}
        role="img"
        aria-label={label}
        data-testid={testId}
        data-player={player}
        data-primitive="drop"
      >
        {inner}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={style}
      aria-hidden
      data-testid={testId}
      data-player={player}
      data-primitive="drop"
    >
      {inner}
    </span>
  );
}
