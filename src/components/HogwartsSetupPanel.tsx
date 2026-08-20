import {
  HOGWARTS_CAMPAIGNS,
  HOGWARTS_HEROES,
  type HogwartsSetupData,
} from '../games/hogwarts-battle/setup';

type Props = {
  value: HogwartsSetupData;
  onChange: (value: HogwartsSetupData) => void;
};

export function HogwartsSetupPanel({ value, onChange }: Props) {
  const heroIds = value.heroIds ?? HOGWARTS_HEROES.map((hero) => hero.id);

  function changeHero(index: number, heroId: string) {
    const nextHeroIds = [...heroIds];
    const previousIndex = nextHeroIds.indexOf(heroId);
    if (previousIndex >= 0) {
      nextHeroIds[previousIndex] = nextHeroIds[index] ?? heroId;
    }
    nextHeroIds[index] = heroId;
    onChange({ ...value, heroIds: nextHeroIds });
  }

  return (
    <section className="hogwarts-setup" data-testid="hogwarts-setup">
      <h2>Set up your Hogwarts game</h2>
      <label className="party-size">
        <span>Year</span>
        <select
          value={value.gameNumber ?? 1}
          data-testid="hogwarts-year"
          onChange={(event) => onChange({ ...value, gameNumber: Number(event.target.value) })}
        >
          {HOGWARTS_CAMPAIGNS.map((campaign) => (
            <option key={campaign.number} value={campaign.number}>
              Year {campaign.number}: {campaign.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Heroes</legend>
        {HOGWARTS_HEROES.map((hero, index) => (
          <label className="party-size" key={hero.id}>
            <span>Seat {index + 1}</span>
            <select
              value={heroIds[index] ?? hero.id}
              data-testid={`hogwarts-hero-${index}`}
              onChange={(event) => changeHero(index, event.target.value)}
            >
              {HOGWARTS_HEROES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
