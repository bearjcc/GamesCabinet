import type { BoardProps } from 'boardgame.io/react';
import { type ReactNode, useState } from 'react';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import type { TracksState } from './game';
import { type Cell, cellAt, HEIGHT, placeError, START_ROW, WIDTH } from './grid';
import { objectiveDef } from './objectives';
import { TileGlyph } from './TileGlyph';
import { allowedRotations, overlayBaseKinds } from './tiles';

function seatLabel(matchData: BoardProps['matchData'], i: number): string {
  const name = matchData?.[i]?.name;
  return name?.trim() || `P${i + 1}`;
}

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
  isActive,
}: BoardProps<TracksState>) {
  const pid = playerID === null || playerID === undefined ? ctx.currentPlayer : playerID;
  const me = Number(pid);
  const [viewBoard, setViewBoard] = useState(me);
  const [selected, setSelected] = useState<string | null>(null);
  const [rot, setRot] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const myTurn = Boolean(isActive && !ctx.gameover) && ctx.currentPlayer === pid;
  const view = G.players[viewBoard] ? viewBoard : me;
  const player = G.players[me];
  const viewed = G.players[view];
  const selectedTile = player?.hand.find((t) => t.id === selected) ?? null;

  const pick = (id: string) => {
    setSelected(selected === id ? null : id);
    setRot(0);
    setHint(null);
  };

  const rotate = () => {
    if (!selectedTile) return;
    const allowed = allowedRotations(selectedTile.kind);
    setRot(allowed[(allowed.indexOf(rot) + 1) % allowed.length]);
  };

  const tryPlace = (row: number, col: number) => {
    if (!myTurn || !selectedTile || G.drawnId === null) return;
    const foreign = view !== me;
    const error = placeError(viewed.board, selectedTile, row, col, rot, { foreign });
    if (error) {
      setHint(error);
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
  if (over) {
    tone = 'done';
    status = over.winners?.length
      ? over.winners.length > 1
        ? `Tie: ${over.winners.map((w) => seatLabel(matchData, Number(w))).join(' & ')}`
        : `${seatLabel(matchData, Number(over.winners[0]))} wins`
      : 'Game over';
  } else if (ctx.phase === 'draft') {
    status = myTurn
      ? 'Choose one objective to keep'
      : `${seatLabel(matchData, Number(ctx.currentPlayer))} is drafting…`;
    if (myTurn) tone = 'you';
  } else if (myTurn) {
    tone = 'you';
    status =
      G.drawnId === null
        ? 'Your turn — draw from the deck or the discard pile'
        : G.drewFromDiscard
          ? 'Play the card you drew from the discard'
          : 'Play a card or discard';
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
      {player && player.objectives.length > 0 ? (
        <ul className="tracks-objectives" data-testid="tracks-objectives">
          {player.objectives.map((id, i) => (
            <li key={`${id}-${i}`}>{objectiveDef(id).name}</li>
          ))}
        </ul>
      ) : null}
    </>
  );

  // ----- board / draft -----
  let board: ReactNode;
  if (ctx.phase === 'draft') {
    const drafter = G.players[Number(ctx.currentPlayer)];
    board = (
      <div className="tracks-draft" data-testid="tracks-draft">
        <h3>Round {G.round} — draft an objective</h3>
        {myTurn ? (
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
          <p>Waiting for {seatLabel(matchData, Number(ctx.currentPlayer))}…</p>
        )}
      </div>
    );
  } else {
    const discardTop = G.discard[G.discard.length - 1];
    board = (
      <div className="tracks-play">
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
          {player?.hand.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tracks-hand__card${selected === t.id ? ' is-selected' : ''}`}
              data-testid={`tracks-hand-${t.id}`}
              onClick={() => pick(t.id)}
              disabled={!myTurn}
            >
              <TileGlyph tile={t} rot={selected === t.id ? rot : 0} />
              <span>{t.kind}</span>
            </button>
          ))}
          {G.drewFromDiscard && discardTop ? (
            <span className="tracks-hand__drawn">
              drawn: <TileGlyph tile={discardTop} rot={0} />
            </span>
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
          disabled={!myTurn || G.drawnId !== null}
        >
          <span className="tracks-pile__deck" />
          Deck ({G.deck.length})
        </button>
        <button
          type="button"
          className="tracks-pile"
          data-testid="tracks-draw-discard"
          onClick={() => moves.drawTile('discard')}
          disabled={!myTurn || G.drawnId !== null || !discardTop}
        >
          {discardTop ? (
            <TileGlyph tile={discardTop} rot={0} />
          ) : (
            <span className="tracks-pile__empty" />
          )}
          Discard
        </button>
        <button
          type="button"
          data-testid="tracks-rotate"
          onClick={rotate}
          disabled={!myTurn || !selectedTile || allowedRotations(selectedTile.kind).length < 2}
        >
          Rotate
        </button>
        <button
          type="button"
          data-testid="tracks-discard"
          onClick={() => {
            if (selectedTile) {
              moves.discardTile(selectedTile.id);
              setSelected(null);
              setRot(0);
            }
          }}
          disabled={!myTurn || G.drawnId === null || G.drewFromDiscard || !selectedTile}
        >
          Discard card
        </button>
      </div>
    ) : null;

  return <PlayTable info={info} board={board} pew={pew} />;
}
