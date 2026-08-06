import {
  asDieFaceValue,
  type DieFaceArtMap,
  type DieFaceValue,
  formatDieLabel,
  resolveDieFaceAsset,
} from '../../games/shared/dice';

export function DieFace({
  face,
  held,
  disabled,
  onToggle,
  faceArt,
  assetSrc,
  testId,
  label,
  index,
}: {
  face: DieFaceValue;
  held?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  /** Face-art override map (slot). Prefer tray-level `faceArt` for games. */
  faceArt?: DieFaceArtMap | null;
  /** Explicit src wins over faceArt / Kenney default. */
  assetSrc?: string | null;
  testId?: string;
  label?: string;
  /** Optional index for aria ("Die 1: 4"). */
  index?: number;
}) {
  const src = assetSrc ?? resolveDieFaceAsset(face, faceArt);
  const aria =
    label ??
    (index != null
      ? `Die ${index + 1}: ${formatDieLabel(face, held)}`
      : formatDieLabel(face, held));

  const className = ['tt-die', held ? 'is-held' : '', disabled ? 'is-disabled' : '']
    .filter(Boolean)
    .join(' ');

  const body = <img className="tt-die__img" src={src} alt="" draggable={false} data-face={face} />;

  // data-primitive="roll" is the cinematic seam - attach roll motion later
  // without editing game boards that already use DieFace / DiceTray.
  if (onToggle) {
    return (
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-label={aria}
        aria-pressed={held ?? false}
        data-testid={testId}
        data-primitive="roll"
        data-face={face}
        onClick={onToggle}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={aria}
      data-testid={testId}
      data-primitive="roll"
      data-face={face}
    >
      {body}
    </div>
  );
}

export function DiceTray({
  dice,
  held,
  disabled,
  onToggle,
  faceArt,
  testId = 'dice-tray',
  testIdPrefix = 'die',
  label = 'Dice',
}: {
  dice: readonly number[];
  /** Per-die held / selected flags (Yatzy hold-to-keep). */
  held?: readonly boolean[];
  disabled?: boolean;
  onToggle?: (index: number) => void;
  /** Optional face-art override map applied to every die. */
  faceArt?: DieFaceArtMap | null;
  testId?: string;
  testIdPrefix?: string;
  label?: string;
}) {
  return (
    <div className="tt-dice" data-testid={testId} role="list" aria-label={label}>
      {dice.map((raw, i) => {
        const face = asDieFaceValue(raw);
        const isHeld = held?.[i] ?? false;
        return (
          <div key={i} className="tt-dice__slot" role="listitem">
            <DieFace
              face={face}
              held={isHeld}
              disabled={disabled}
              faceArt={faceArt}
              index={i}
              testId={`${testIdPrefix}-${i}`}
              onToggle={onToggle ? () => onToggle(i) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
