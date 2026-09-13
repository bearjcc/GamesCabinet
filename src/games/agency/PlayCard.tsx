import { cardDef } from './cards';

type PlayCardProps = {
  cardId: string;
  size?: 'hand' | 'market';
};

export function PlayCard({ cardId, size = 'hand' }: PlayCardProps) {
  const def = cardDef(cardId);
  if (!def) return null;

  return (
    <article
      className={`agency-play-card agency-play-card--${size}`}
      data-testid={`agency-play-${cardId}`}
    >
      <header className="agency-play-card__header">
        <span className="agency-play-card__cost">{def.marketCost}</span>
        <h4 className="agency-play-card__name">{def.name}</h4>
      </header>
      <p className="agency-play-card__blurb">{def.blurb}</p>
    </article>
  );
}
