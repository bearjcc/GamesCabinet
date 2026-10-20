import type { BoardProps } from 'boardgame.io/react';
import { type ReactNode, useState } from 'react';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { useHotseatClaimSeat } from '../../lib/hotseat';
import { SOLO_DISCARD_LIMIT, type TracksState } from './game';
import { type Cell, cellAt, HEIGHT, placeError, START_ROW, WIDTH } from './grid';
import { objectiveDef } from './objectives';
import { TileGlyph } from './TileGlyph';
import { allowedRotations, overlayBaseKinds } from './tiles';

function seatLabel(matchData: BoardProps['matchData'], i: number): string {
  const name = matchData?.[i]?.name;
  return name?.trim() || `P${i + 1}`;
}

/** Plain-language reasons for an illegal drop (placeError keys). */
export const HINTS: Record<string, string> = {
  'off-grid': 'That slot is off the board.',
  'foreign-end-column': "You can't play in the first or last column of someone else's board.",
  'bad-overlay': "That card can't go on top of what's there.",
  'off-grid-connection': 'Track may only leave the board at the start or destination.',
  'material-mismatch': 'Rail meets rail, bridge meets bridge, tunnel meets tunnel.',
  'not-connected': 'Track must connect to the start or to track already laid.',
  occupied: 'That slot is taken.',
  'river-before-tunnel': "You can't put a river in front of a middle tunnel.",
  'mountain-before-bridge': "You can't put a mountain in front of a middle bridge.",
};

const KIND_LABEL: Record<string, string> = {
  straight: 'Straight',
  curve: 'Curve',
  junction: 'Junction',
  'bridge-start': 'Land to bridge',
  'bridge-mid': 'Middle bridge',
  'tunnel-arch': 'Tunnel arch',
  'tunnel-mid': 'Middle tunnel',
  whistlestop: 'Whistlestop',
  obstacle: 'Obstacle',
};

function CellView({ cell }: { cell: Cell }) {
  if (!cell) return null;
  return (
    <>
      <TileGlyph tile={cell.base.tile} rot={cell.base.rot} />
      {cell.top ? (
        <span className="tracks-cell__overlay">
          <TileGlyph tile={cell.top.tile} rot={cell.top.rot} />
        </span>
      ) : null}
    </>
  );
}

export function TracksBoard({
  G,
  ctx,
  moves,
  playerID,
  matchData,
  matchID,
  isActive,
}: BoardProps<TracksState>) {
  const pid = playerID === null || playerID === undefined ? ctx.currentPlayer : playerID;
  const me = Number(pid);
  const [viewBoard, setViewBoard] = useState(me);
  const [selected, setSelected] = useState<string | null>(null);
  const [rot, setRot] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  // Hot-seat hand-off: hide hands until the next seat says they're ready.
  const turnKey = `${ctx.phase}-${ctx.turn}-${ctx.currentPlayer}`;
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const claimHotseatSeat = useHotseatClaimSeat();
  // Pass-and-play matches are local-* ids; online seats never hand off.
  const hotSeat = ctx.numPlayers > 1 && (matchID ?? '').startsWith('local-');
  const handOff = hotSeat && !ctx.gameover && readyFor !== turnKey;

  const myTurn = Boolean(isActive && !ctx.gameover) && ctx.currentPlayer === pid;
  const view = G.players[viewBoard] ? viewBoard : me;
  const player = G.players[me];
  const viewed = G.players[view];
  const discardTopNow = G.discard[G.discard.length - 1];
  const drawnFromDiscard =
    G.drewFromDiscard && discardTopNow?.id === G.drawnId ? discardTopNow : null;
  const selectedTile =
    player?.hand.find((t) => t.id === selected) ??
    (drawnFromDiscard && drawnFromDiscard.id === selected ? drawnFromDiscard : null);

  /** Tap a card to pick it up; tap it again to turn it. */
  const pick = (id: string) => {
    setHint(null);
    if (selected === id && selectedTile) {
      const allowed = allowedRotations(selectedTile.kind);
      setRot(allowed[(allowed.indexOf(rot) + 1) % allowed.length]);
      return;
    }
    setSelected(id);
    setRot(0);
  };

  /** Tap the discard pile: draw from it, or (after drawing) discard the held card. */
  const tapDiscard = () => {
    if (!myTurn) return;
    if (G.drawnId === null) {
      moves.drawTile('discard');
      return;
    }
    if (selectedTile && !G.drewFromDiscard) {
      moves.discardTile(selectedTile.id);
      setSelected(null);
      setRot(0);
    }
  };

  const tryPlace = (row: number, col: number) => {
    if (!myTurn || !selectedTile || G.drawnId === null) return;
    const foreign = view !== me;
    const error = placeError(viewed.board, selectedTile, row, col, rot, { foreign });
    if (error) {
      setHint(HINTS[error] ?? error);
      return;
    }
    moves.playTile(selectedTile.id, view, row, col, rot);
    setSelected(null);
    setRot(0);
    setHint(null);
  };

  // ----- status -----
  let status: string;
  let tone: 'neutral' | 'you' | 'wait' | 'done' = 'wait';
  const over = ctx.gameover as { winners?: string[] } | undefined;
  const who = seatLabel(matchData, Number(ctx.currentPlayer));
  if (over) {
    tone = 'done';
    status = over.winners?.length
      ? over.winners.length > 1
        ? `Tie: ${over.winners.map((w) => seatLabel(matchData, Number(w))).join(' & ')}`
        : `${seatLabel(matchData, Number(over.winners[0]))} wins`
      : 'Game over';
  } else if (ctx.phase === 'draft') {
    status = myTurn ? `${who}: keep one objective` : `${who} is drafting`;
    if (myTurn) tone = 'you';
  } else if (myTurn) {
    tone = 'you';
    status =
      G.drawnId === null
        ? `${who}: draw from the deck${ctx.numPlayers > 1 ? ' or the discard pile' : ''}`
        : G.drewFromDiscard
          ? `${who}: play the card you took from the discard`
          : `${who}: play a card, or tap the discard pile to discard it`;
  } else {
    status = `${seatLabel(matchData, Number(ctx.currentPlayer))}'s turn`;
  }

  // ----- info rail -----
  const info = (
    <>
      <span data-testid="tracks-status">
        <StatusBar text={status} tone={tone} />
      </span>
      <MatchScoreboard
        testId="tracks-meta"
        scores={[
          { label: 'Round', value: `${Math.min(G.round, 5)}/5` },
          ...G.scores.map((s, i) => ({
            label: seatLabel(matchData, i),
            value: `${s}${G.connectedOrder.includes(String(i)) ? ' *' : ''}`,
          })),
        ]}
      />
      {G.players.length === 1 ? (
        <span data-testid="tracks-solo-discards">
          Discards {G.soloDiscards ?? 0}/{SOLO_DISCARD_LIMIT}
        </span>
      ) : null}
      {G.publicObjectives.length > 0 ? (
        <ul
          className="tracks-objectives tracks-objectives--public"
          data-testid="tracks-public-objectives"
        >
          {G.publicObjectives.map((id) => (
            <li key={id}>
              <span className="tracks-objectives__tag">Public</span>
              {objectiveDef(id).name}
            </li>
          ))}
        </ul>
      ) : null}
      {!handOff && player && player.objectives.length > 0 ? (
        <ul className="tracks-objectives tracks-objectives--secret" data-testid="tracks-objectives">
          {player.objectives.map((id, i) => (
            <li key={`${id}-${i}`}>
              <span className="tracks-objectives__tag">Secret</span>
              {objectiveDef(id).name}
            </li>
          ))}
        </ul>
      ) : null}
      <details className="tracks-rules" data-testid="tracks-scoring-rules">
        <summary>Scoring</summary>
        <ul>
          <li>Connected start to destination: 10.</li>
          <li>Not connected: the column number of your furthest connected track (1–8).</li>
          <li>Cards off your route are removed and score nothing.</li>
          <li>
            Straight, obstacle 0 · curve 1 · junction {G.junctionPoints} · land to bridge, tunnel
            arch, whistlestop 2 · middle bridge or tunnel 3.
          </li>
          <li>Whistlestop: 2 when legally placed (one connection is enough).</li>
          <li>Completed objectives score and are discarded; others carry over.</li>
          <li>Public objectives are scored each round to the table leader.</li>
          {G.players.length === 1 ? (
            <li>
              Solo: no discard draws or reshuffle; the round ends when you connect or on your 5th
              discard.
            </li>
          ) : (
            <li>
              With others: once anyone connects start to destination, finish the current lap — play
              stops just before the round&apos;s starting player would go again.
            </li>
          )}
          {G.discardDrawRule === '2021' ? (
            <li>Discard draw (2021): take the top discard freely; play or discard any card.</li>
          ) : (
            <li>Discard draw (2023): a discard draw must be played immediately.</li>
          )}
          <li>Five rounds. Highest total wins.</li>
        </ul>
      </details>
    </>
  );

  // ----- board / draft -----
  let board: ReactNode;
  if (ctx.phase === 'draft') {
    const drafter = G.players[Number(ctx.currentPlayer)];
    board = (
      <div className="tracks-draft" data-testid="tracks-draft">
        <h3>Round {G.round} — draft an objective</h3>
        {myTurn && !handOff ? (
          <div className="tracks-draft__cards">
            {drafter.draft.map((id) => {
              const def = objectiveDef(id);
              return (
                <button
                  key={id}
                  type="button"
                  className="tracks-objective-card"
                  data-testid={`tracks-draft-${id}`}
                  onClick={() => moves.chooseObjective(id)}
                >
                  <strong>{def.name}</strong>
                  <span>{def.text}</span>
                  <em>
                    {def.id === 'mayor' || def.id === 'mountain-express'
                      ? 'per card'
                      : `+${def.points}`}
                  </em>
                </button>
              );
            })}
          </div>
        ) : (
          <p>Waiting for {who}</p>
        )}
      </div>
    );
  } else {
    board = (
      <div className="tracks-play" data-testid="tracks-play-surface">
        <div className="tracks-boardswitch" role="tablist" aria-label="Boards">
          {G.players.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === view ? 'is-active' : ''}
              data-testid={`tracks-target-${i}`}
              onClick={() => setViewBoard(i)}
            >
              {seatLabel(matchData, i)}
              {G.connectedOrder.includes(String(i)) ? ' *' : ''}
            </button>
          ))}
        </div>
        <div className="tracks-grid" data-testid="tracks-board">
          {Array.from({ length: HEIGHT }, (_, row) =>
            Array.from({ length: WIDTH }, (_, col) => {
              const cell = cellAt(viewed.board, row, col);
              const overlay = selectedTile ? overlayBaseKinds(selectedTile.kind) !== null : false;
              const canPlaceHere =
                myTurn &&
                selectedTile !== null &&
                G.drawnId !== null &&
                placeError(viewed.board, selectedTile, row, col, rot, { foreign: view !== me }) ===
                  null;
              const terminal =
                row === START_ROW && (col === 0 || col === WIDTH - 1) ? (
                  <span
                    className={`tracks-terminal tracks-terminal--${col === 0 ? 'start' : 'end'}`}
                  >
                    {col === 0 ? 'START' : 'END'}
                  </span>
                ) : null;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={`tracks-cell${cell ? ' is-filled' : ''}${canPlaceHere ? ' is-legal' : ''}${overlay ? ' is-overlay-target' : ''}`}
                  data-testid={`tracks-cell-${row}-${col}`}
                  onClick={() => tryPlace(row, col)}
                  disabled={!canPlaceHere && !cell}
                >
                  {terminal}
                  <CellView cell={cell} />
                </button>
              );
            }),
          )}
        </div>
        {hint ? (
          <p className="tracks-hint" role="alert" data-testid="tracks-hint">
            {hint}
          </p>
        ) : null}
        <div className="tracks-hand" data-testid="tracks-hand">
          {(handOff ? [] : (player?.hand ?? [])).map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tracks-hand__card${selected === t.id ? ' is-selected' : ''}`}
              data-testid={`tracks-hand-${t.id}`}
              onClick={() => pick(t.id)}
              disabled={!myTurn || G.drewFromDiscard}
            >
              <TileGlyph tile={t} rot={selected === t.id ? rot : 0} />
              <span>{KIND_LABEL[t.kind]}</span>
            </button>
          ))}
          {drawnFromDiscard && !handOff ? (
            <button
              type="button"
              className={`tracks-hand__card tracks-hand__card--drawn${selected === drawnFromDiscard.id ? ' is-selected' : ''}`}
              data-testid="tracks-hand-drawn"
              onClick={() => pick(drawnFromDiscard.id)}
              disabled={!myTurn}
            >
              <TileGlyph tile={drawnFromDiscard} rot={selected === drawnFromDiscard.id ? rot : 0} />
              <span>{KIND_LABEL[drawnFromDiscard.kind]}</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // ----- pew: deck + discard + actions -----
  const discardTop = G.discard[G.discard.length - 1];
  const pew =
    ctx.phase === 'play' ? (
      <div className="tracks-piles">
        <button
          type="button"
          className="tracks-pile"
          data-testid="tracks-draw-deck"
          onClick={() => moves.drawTile('deck')}
          disabled={handOff || !myTurn || G.drawnId !== null}
        >
          <span className="tracks-pile__deck" />
          Deck ({G.deck.length})
        </button>
        <button
          type="button"
          className="tracks-pile"
          data-testid="tracks-draw-discard"
          onClick={tapDiscard}
          disabled={
            handOff ||
            !myTurn ||
            (G.drawnId === null
              ? !discardTop || ctx.numPlayers === 1
              : G.drewFromDiscard || !selectedTile)
          }
        >
          {discardTop ? (
            <TileGlyph tile={discardTop} rot={0} />
          ) : (
            <span className="tracks-pile__empty" />
          )}
          Discard
        </button>
      </div>
    ) : null;

  const shownBoard = handOff ? (
    <div className="tracks-handoff" data-testid="tracks-handoff">
      <p>Pass the device to</p>
      <strong>{who}</strong>
      <button
        type="button"
        className="tracks-handoff__ready"
        data-testid="tracks-handoff-ready"
        onClick={() => {
          setReadyFor(turnKey);
          claimHotseatSeat?.();
        }}
      >
        I'm {who}
      </button>
    </div>
  ) : (
    board
  );

  return <PlayTable info={info} board={shownBoard} pew={pew} />;
}
