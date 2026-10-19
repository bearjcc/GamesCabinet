import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
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
import { getGameMeta, isAccessGated, isSoloOnly, soloPlayPath } from '../lib/games';
import { hostRoom } from '../lib/lobby';
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
  const maxSeats =
    meta?.id === 'hogwarts-battle'
      ? getHogwartsHeroIdsForYear(hogwartsYear).length
      : (meta?.maxPlayers ?? 1);
  const [tableSeats, setTableSeats] = useState<TableSeat[]>(() => createTableSeats(meta, 1));

  useEffect(() => {
    setHogwartsYear(1);
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
      const room = await hostRoom(
        meta.id,
        launchPlan.seats,
        name,
        hogwartsSetup,
        ownedDeviceJoins(boundedSeats),
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
    if (launchPlan.mode === 'bot') {
      navigate(`/vs-bot/${meta.id}?kinds=${occupiedKindsQuery(boundedSeats)}`);
      return;
    }
    const query =
      meta.id === 'hogwarts-battle' && hogwartsSetup
        ? hogwartsPlayQuery(hogwartsSetup, launchPlan.seats)
        : `?seats=${launchPlan.seats}`;
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

  return (
    <Shell title={meta.name} backTo="/">
      <p className="launch-blurb">{meta.blurb}</p>
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
          meta.id === 'hogwarts-battle' ? (
            <div className="table-year-strip">
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
                {HOGWARTS_CAMPAIGNS.find((c) => c.number === hogwartsYear)?.name}
              </p>
            </div>
          ) : null
        }
        maxSeats={maxSeats}
        meta={meta}
        onChange={updateSeats}
        seatDetails={
          meta.id === 'hogwarts-battle'
            ? (seat, index) => (
                <select
                  className="table-spot-hero"
                  data-testid={`hogwarts-hero-${index}`}
                  onChange={(event) => changeHogwartsHero(index, event.target.value)}
                  value={seat.role ?? getHogwartsHeroIdsForYear(hogwartsYear)[index]}
                >
                  {getHogwartsHeroesForYear(hogwartsYear).map((hero) => (
                    <option key={hero.id} value={hero.id}>
                      {hero.name}
                    </option>
                  ))}
                </select>
              )
            : undefined
        }
        seats={boundedSeats}
      />
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
  return Array.from({ length: maxSeats }, (_, index) => ({
    kind: index < defaultCount ? ('local' as const) : ('empty' as const),
    ...(heroes[index] ? { role: heroes[index] } : {}),
  }));
}
