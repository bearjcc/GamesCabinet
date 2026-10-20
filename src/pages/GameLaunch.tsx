import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { GameThumbnail } from '../components/GameThumbnail';
import { SeatColoursProvider } from '../components/SeatColours';
import { Shell } from '../components/Shell';
import { TableSetup } from '../components/TableSetup';
import { UnlockPanel } from '../components/UnlockPanel';
import {
  createHogwartsSetupData,
  getHogwartsHeroesForYear,
  getHogwartsHeroIdsForYear,
  HOGWARTS_CAMPAIGNS,
  hogwartsPlayQuery,
} from '../games/hogwarts-battle/setup';
import { DEFAULT_TRACKS_SETUP, type TracksSetupData, tracksPlayQuery } from '../games/tracks/setup';
import { getGameMeta, isAccessGated, isSoloOnly, soloPlayPath } from '../lib/games';
import { hostRoom } from '../lib/lobby';
import { ensureSeatColours, launchSeatColourList, seatColoursQuery } from '../lib/seatColours';
import { getNickname, getUnlockedGames, setNickname } from '../lib/storage';
import {
  deriveLaunch,
  occupiedKindsQuery,
  ownedDeviceJoins,
  type TableSeat,
} from '../lib/tableSetup';

export function GameLaunch() {
  const { gameId = '' } = useParams();
  const meta = getGameMeta(gameId);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [hogwartsYear, setHogwartsYear] = useState(1);
  const [tracksSetup, setTracksSetup] = useState<TracksSetupData>(DEFAULT_TRACKS_SETUP);
  const maxSeats =
    meta?.id === 'hogwarts-battle'
      ? getHogwartsHeroIdsForYear(hogwartsYear).length
      : (meta?.maxPlayers ?? 1);
  const [tableSeats, setTableSeats] = useState<TableSeat[]>(() => createTableSeats(meta, 1));

  useEffect(() => {
    setHogwartsYear(1);
    setTracksSetup(DEFAULT_TRACKS_SETUP);
    setTableSeats(createTableSeats(meta, 1));
  }, [meta]);

  const boundedSeats = useMemo(() => tableSeats.slice(0, maxSeats), [maxSeats, tableSeats]);
  const launchPlan = meta
    ? deriveLaunch(meta, boundedSeats)
    : { status: 'invalid' as const, reason: '' };
  const hogwartsSetup =
    meta?.id === 'hogwarts-battle'
      ? createHogwartsSetupData(
          hogwartsYear,
          boundedSeats
            .filter((seat) => seat.kind !== 'empty')
            .map(
              (seat, index) => seat.role ?? getHogwartsHeroIdsForYear(hogwartsYear)[index] ?? '',
            ),
        )
      : undefined;

  function updateSeats(next: TableSeat[]) {
    setTableSeats(next);
  }

  function changeHogwartsYear(nextYear: number) {
    if (meta?.id !== 'hogwarts-battle') return;
    const availableHeroIds = getHogwartsHeroIdsForYear(nextYear);
    setHogwartsYear(nextYear);
    setTableSeats((previousSeats) =>
      Array.from({ length: availableHeroIds.length }, (_, index) => ({
        ...(previousSeats[index] ?? { kind: 'empty' as const }),
        role: availableHeroIds[index],
      })),
    );
  }

  function changeHogwartsHero(index: number, heroId: string) {
    setTableSeats((previousSeats) => {
      const nextSeats = previousSeats.map((seat) => ({ ...seat }));
      const previousIndex = nextSeats.findIndex(
        (seat, seatIndex) => seatIndex !== index && seat.role === heroId,
      );
      if (previousIndex >= 0) {
        nextSeats[previousIndex]!.role = nextSeats[index]!.role;
      }
      nextSeats[index]!.role = heroId;
      return nextSeats;
    });
  }

  async function onHost() {
    if (!meta || launchPlan.status !== 'ready' || launchPlan.mode !== 'online') return;
    setBusy(true);
    setError('');
    const name = getNickname() || 'Player';
    setNickname(name);
    try {
      const colouredSeats = ensureSeatColours(boundedSeats);
      const room = await hostRoom(
        meta.id,
        launchPlan.seats,
        name,
        hogwartsSetup,
        ownedDeviceJoins(colouredSeats),
        seatColoursQuery(colouredSeats) ?? undefined,
      );
      navigate(`/g/${room.gameName}/${room.matchID}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create room');
    } finally {
      setBusy(false);
    }
  }

  function onStart() {
    if (!meta || launchPlan.status !== 'ready' || launchPlan.mode === 'online') return;
    const colouredSeats = ensureSeatColours(boundedSeats);
    const colourQuery = seatColoursQuery(colouredSeats);
    if (launchPlan.mode === 'bot') {
      const params = new URLSearchParams({ kinds: occupiedKindsQuery(colouredSeats) });
      if (colourQuery) params.set('colours', colourQuery);
      navigate(`/vs-bot/${meta.id}?${params.toString()}`);
      return;
    }
    const query =
      meta.id === 'hogwarts-battle' && hogwartsSetup
        ? hogwartsPlayQuery(hogwartsSetup, launchPlan.seats)
        : meta.id === 'tracks'
          ? tracksPlayQuery(tracksSetup, launchPlan.seats, colourQuery ?? undefined)
          : (() => {
              const params = new URLSearchParams({ seats: String(launchPlan.seats) });
              if (colourQuery) params.set('colours', colourQuery);
              return `?${params.toString()}`;
            })();
    navigate(`/play/${meta.id}${query}`);
  }

  if (!meta) {
    return (
      <Shell title="Unknown game">
        <p>That game is not in the cabinet.</p>
        <Link className="btn" to="/">
          Back
        </Link>
      </Shell>
    );
  }

  const locked = isAccessGated(meta) && !justUnlocked && !getUnlockedGames().includes(meta.id);
  if (locked) {
    return (
      <Shell title="Hidden shelf" backTo="/">
        <div data-testid="launch-locked">
          <p className="launch-blurb">This shelf is hidden. Enter its access code to open it.</p>
          <UnlockPanel onUnlocked={() => setJustUnlocked(true)} />
        </div>
      </Shell>
    );
  }

  if (isSoloOnly(meta)) {
    return <Navigate to={soloPlayPath(meta.id)} replace />;
  }

  const launchColours = launchSeatColourList(boundedSeats);

  return (
    <Shell title={meta.name} backTo="/" layout="catalogue">
      <p className="launch-blurb">{meta.blurb}</p>
      <SeatColoursProvider colours={launchColours}>
        <TableSetup
          action={
            <button
              className="btn primary"
              data-testid={
                launchPlan.status === 'ready' && launchPlan.mode === 'online'
                  ? 'host-room'
                  : 'play-start'
              }
              disabled={busy || launchPlan.status !== 'ready'}
              onClick={
                launchPlan.status === 'ready' && launchPlan.mode === 'online' ? onHost : onStart
              }
              type="button"
            >
              {launchPlan.status === 'ready' && launchPlan.mode === 'online' ? 'Host' : 'Start'}
            </button>
          }
          centreContent={
            <>
              <GameThumbnail gameId={meta.id} variant="launch" />
              {meta.id === 'hogwarts-battle' ? (
                <div className="table-year-strip" data-testid="hogwarts-year-strip">
                  <span className="table-year-label">Year</span>
                  <div className="table-year-chips" role="radiogroup" aria-label="Campaign year">
                    {HOGWARTS_CAMPAIGNS.map((campaign) => (
                      <button
                        aria-checked={hogwartsYear === campaign.number}
                        className={
                          hogwartsYear === campaign.number
                            ? 'table-year-chip selected'
                            : 'table-year-chip'
                        }
                        data-testid={`hogwarts-year-${campaign.number}`}
                        key={campaign.number}
                        onClick={() => changeHogwartsYear(campaign.number)}
                        role="radio"
                        type="button"
                      >
                        {campaign.number}
                      </button>
                    ))}
                  </div>
                  <p className="table-year-name">
                    {HOGWARTS_CAMPAIGNS.find((campaign) => campaign.number === hogwartsYear)?.name}
                  </p>
                </div>
              ) : meta.id === 'tracks' ? (
                <div className="table-year-strip tracks-launch-variants">
                  <label>
                    <span className="table-year-label">Discard draw</span>
                    <select
                      data-testid="tracks-discard-rule"
                      value={tracksSetup.discardDrawRule}
                      onChange={(event) =>
                        setTracksSetup((prev) => ({
                          ...prev,
                          discardDrawRule: event.target.value as TracksSetupData['discardDrawRule'],
                        }))
                      }
                    >
                      <option value="2023">2023 — must play immediately</option>
                      <option value="2021">2021 — take freely</option>
                    </select>
                  </label>
                  <label>
                    <span className="table-year-label">Junction points</span>
                    <select
                      data-testid="tracks-junction-points"
                      value={tracksSetup.junctionPoints}
                      onChange={(event) =>
                        setTracksSetup((prev) => ({
                          ...prev,
                          junctionPoints: Number(event.target.value) as 1 | 2,
                        }))
                      }
                    >
                      <option value="2">2 (default)</option>
                      <option value="1">1</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </>
          }
          maxSeats={maxSeats}
          meta={meta}
          onChange={updateSeats}
          seatDetails={
            meta.id === 'hogwarts-battle'
              ? (seat, index) => {
                  const heroes = getHogwartsHeroesForYear(hogwartsYear);
                  const heroId = seat.role ?? heroes[index]?.id ?? heroes[0]?.id ?? '';
                  const hero = heroes.find((entry) => entry.id === heroId) ?? heroes[0];
                  if (!hero) return null;
                  return (
                    <button
                      className="table-spot-hero"
                      data-testid={`hogwarts-hero-${index}`}
                      onClick={() => {
                        const nextIndex =
                          (heroes.findIndex((entry) => entry.id === hero.id) + 1) % heroes.length;
                        changeHogwartsHero(index, heroes[nextIndex]!.id);
                      }}
                      type="button"
                    >
                      {hero.name}
                    </button>
                  );
                }
              : undefined
          }
          seats={boundedSeats}
        />
      </SeatColoursProvider>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </Shell>
  );
}

function createTableSeats(meta: ReturnType<typeof getGameMeta>, year: number): TableSeat[] {
  const maxSeats =
    meta?.id === 'hogwarts-battle'
      ? getHogwartsHeroIdsForYear(year).length
      : (meta?.maxPlayers ?? 1);
  const defaultCount = Math.min(maxSeats, meta && meta.minPlayers >= 2 ? meta.minPlayers : 1);
  const heroes = meta?.id === 'hogwarts-battle' ? getHogwartsHeroIdsForYear(year) : [];
  const initial = Array.from({ length: maxSeats }, (_, index) => ({
    kind: index < defaultCount ? ('local' as const) : ('empty' as const),
    ...(heroes[index] ? { role: heroes[index] } : {}),
  }));
  return meta?.id === 'hogwarts-battle' ? initial : ensureSeatColours(initial);
}
