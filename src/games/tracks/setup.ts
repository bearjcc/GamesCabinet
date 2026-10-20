/** Launch-time rules variants for TRACKS (pass-and-play / local). */
export type DiscardDrawRule = '2021' | '2023';

export type TracksSetupData = {
  discardDrawRule: DiscardDrawRule;
  junctionPoints: 1 | 2;
};

export const DEFAULT_TRACKS_SETUP: TracksSetupData = {
  discardDrawRule: '2023',
  junctionPoints: 2,
};

export function parseTracksSetup(
  discard?: string | null,
  junction?: string | null,
): TracksSetupData {
  const discardDrawRule = discard === '2021' ? '2021' : '2023';
  const junctionPoints = junction === '1' ? 1 : 2;
  return { discardDrawRule, junctionPoints };
}

export function tracksPlayQuery(setup: TracksSetupData, seats: number, colours?: string): string {
  const params = new URLSearchParams();
  params.set('seats', String(seats));
  if (setup.discardDrawRule !== '2023') params.set('discard', setup.discardDrawRule);
  if (setup.junctionPoints !== 2) params.set('junction', String(setup.junctionPoints));
  if (colours) params.set('colours', colours);
  return `?${params.toString()}`;
}
