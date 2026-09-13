import { cardDef } from './cards';
import { abilitiesForPerson, type PersonDossier, personDossier } from './personData';

type PersonCardProps = {
  cardId: string;
  /** hand | market | slot — slot is compact for facility staff */
  size?: 'hand' | 'market' | 'slot';
};

function FactionBadge({ dossier }: { dossier: PersonDossier }) {
  return (
    <div className={`agency-person__faction agency-person__faction--${dossier.faction}`}>
      <span className="agency-person__faction-label">Faction</span>
      <span className="agency-person__faction-name">{dossier.factionLabel}</span>
    </div>
  );
}

export function PersonCard({ cardId, size = 'hand' }: PersonCardProps) {
  const def = cardDef(cardId);
  if (def?.kind !== 'person') return null;

  const dossier = personDossier(cardId);
  const abilities = abilitiesForPerson(def);
  const eras = dossier?.eras ?? [1];
  const eraLabel = eras.length === 1 ? `ERA ${eras[0]}` : `ERAS ${eras.join('+')}`;

  if (size === 'slot') {
    return (
      <div className="agency-person agency-person--slot" data-testid={`agency-person-${cardId}`}>
        <span className="agency-person__slot-name">{def.name}</span>
        <span className="agency-person__slot-title">{dossier?.title ?? 'Person'}</span>
      </div>
    );
  }

  return (
    <article
      className={`agency-person agency-person--${size}`}
      data-testid={`agency-person-${cardId}`}
      aria-label={`${def.name}, ${dossier?.title ?? 'Person'}`}
    >
      <header className="agency-person__header">
        <div className="agency-person__cost">
          <span className="agency-person__cost-label">Funding cost</span>
          <span className="agency-person__cost-value">{def.marketCost}</span>
          <span className="agency-person__cost-icon" aria-hidden="true">
            $
          </span>
        </div>

        <div className="agency-person__identity">
          <h4 className="agency-person__name">{def.name}</h4>
          <p className="agency-person__title">{dossier?.title ?? 'Person'}</p>
          <span className="agency-person__type">Person</span>
          {dossier?.rarity === 'rare' ? <span className="agency-person__rare">Rare</span> : null}
        </div>

        {dossier ? <FactionBadge dossier={dossier} /> : null}
      </header>

      <div className="agency-person__portrait" aria-hidden="true">
        <div
          className={`agency-person__portrait-art agency-person__portrait-art--${dossier?.portraitSeed ?? 'default'}`}
        />
        {dossier?.program ? (
          <span className="agency-person__portrait-meta">{dossier.program}</span>
        ) : null}
      </div>

      <section className="agency-person__on-play" aria-label="On play">
        <span className="agency-person__on-play-label">On play</span>
        <ul className="agency-person__abilities">
          {abilities.map((row) => (
            <li key={`${row.track}-${row.label}`} className="agency-person__ability">
              <span
                className={`agency-person__ability-icon agency-person__ability-icon--${row.track}`}
                aria-hidden="true"
              >
                {row.value}
              </span>
              <span className="agency-person__ability-text">
                <strong>{row.label}</strong>
                <span>{row.effect}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="agency-person__assign-hint">Or assign to a facility for turn bonuses.</p>
      </section>

      {dossier && size === 'hand' ? (
        <footer className="agency-person__footer">
          {dossier.program ? (
            <span className="agency-person__footer-cell">
              <span className="agency-person__footer-key">Program</span>
              <span>{dossier.program}</span>
            </span>
          ) : null}
          {dossier.role ? (
            <span className="agency-person__footer-cell">
              <span className="agency-person__footer-key">Role</span>
              <span>{dossier.role}</span>
            </span>
          ) : null}
          {dossier.clearance ? (
            <span className="agency-person__footer-cell">
              <span className="agency-person__footer-key">Clearance</span>
              <span className="agency-person__clearance">{dossier.clearance}</span>
            </span>
          ) : null}
        </footer>
      ) : null}

      <span className="agency-person__era-tab">{eraLabel}</span>
    </article>
  );
}
