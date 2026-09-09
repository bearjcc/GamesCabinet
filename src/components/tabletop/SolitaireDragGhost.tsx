import type { Card } from '../../games/shared/cards';
import { CardFace } from './CardFace';

export function SolitaireDragGhost({
  x,
  y,
  cards,
  assetSrcs,
  cardWidthRem,
}: {
  x: number;
  y: number;
  cards: readonly Card[];
  assetSrcs: readonly string[];
  cardWidthRem: number;
}) {
  if (cards.length === 0) return null;

  const stackStepPx = cardWidthRem * (190 / 140) * 0.22 * 16;

  return (
    <div
      className="sol-drag-ghost sol-drag-ghost__stack"
      style={{
        left: x,
        top: y,
        ['--sol-ghost-w' as string]: `${cardWidthRem}rem`,
      }}
      aria-hidden="true"
    >
      {cards.map((card, i) => (
        <div
          key={card.id}
          style={{
            position: i === 0 ? 'relative' : 'absolute',
            top: i * stackStepPx,
            left: 0,
            zIndex: i,
          }}
        >
          <CardFace card={card} assetSrc={assetSrcs[i]} />
        </div>
      ))}
    </div>
  );
}
