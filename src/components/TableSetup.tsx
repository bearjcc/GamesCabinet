import { type ReactNode, useMemo } from 'react';
import type { GameMeta } from '../lib/games';
import { getSeatColour, SEAT_COLOUR_PALETTE } from '../lib/storage';
import { deriveLaunch, getSeatKinds, type SeatKind, type TableSeat } from '../lib/tableSetup';

type Props = {
  meta: GameMeta;
  seats: TableSeat[];
  onChange: (seats: TableSeat[]) => void;
  maxSeats?: number;
  showColours?: boolean;
  centreContent?: ReactNode;
  action: ReactNode;
  seatDetails?: (seat: TableSeat, index: number) => ReactNode;
};

const SEAT_LABELS: Record<SeatKind, string> = {
  empty: 'Empty',
  local: 'This table',
  online: 'Online',
  bot: 'Bot',
};

function nextColour(seats: readonly TableSeat[]): string {
  const used = new Set(seats.map((seat) => seat.colour).filter(Boolean));
  return SEAT_COLOUR_PALETTE.find((colour) => !used.has(colour)) ?? getSeatColour();
}

export function TableSetup({
  meta,
  seats,
  onChange,
  maxSeats = meta.maxPlayers,
  showColours = true,
  centreContent,
  action,
  seatDetails,
}: Props) {
  const boundedSeats = useMemo(() => seats.slice(0, maxSeats), [maxSeats, seats]);
  const allowedKinds = getSeatKinds(meta);
  const plan = deriveLaunch(meta, boundedSeats);
  const occupied = boundedSeats.filter((seat) => seat.kind !== 'empty').length;

  function updateSeat(index: number, next: Partial<TableSeat>) {
    onChange(
      boundedSeats.map((seat, seatIndex) => (seatIndex === index ? { ...seat, ...next } : seat)),
    );
  }

  function changeKind(index: number, kind: SeatKind) {
    if (!allowedKinds.includes(kind)) return;
    updateSeat(index, {
      kind,
      ...(kind === 'local' || kind === 'bot'
        ? { colour: boundedSeats[index]?.colour ?? nextColour(boundedSeats) }
        : { colour: undefined }),
    });
  }

  return (
    <section className="table-setup launch-modes" data-testid="launch-modes">
      <div className={`table-stage table-stage-${boundedSeats.length}`}>
        {boundedSeats.map((seat, index) => (
          <article
            className={`table-seat table-seat-${index}`}
            data-testid={`table-seat-${index}`}
            key={index}
          >
            <div className="table-seat-heading">
              <span className="table-seat-number">Seat {index + 1}</span>
              {seat.kind !== 'empty' ? (
                <span className="table-seat-state">{SEAT_LABELS[seat.kind]}</span>
              ) : null}
            </div>
            <div
              className="table-seat-kinds"
              data-testid={`table-seat-${index}-kind`}
              role="group"
              aria-label={`Seat ${index + 1} type`}
            >
              {allowedKinds.map((kind) => (
                <button
                  className={seat.kind === kind ? 'btn selected' : 'btn'}
                  aria-pressed={seat.kind === kind}
                  data-testid={`table-seat-${index}-kind-${kind}`}
                  key={kind}
                  onClick={() => changeKind(index, kind)}
                  type="button"
                >
                  {SEAT_LABELS[kind]}
                </button>
              ))}
            </div>
            {seat.kind !== 'empty' && showColours && seat.kind !== 'online' ? (
              <div
                className="table-seat-colours"
                role="radiogroup"
                aria-label={`Seat ${index + 1} colour`}
              >
                {SEAT_COLOUR_PALETTE.map((colour) => (
                  <button
                    aria-checked={seat.colour === colour}
                    aria-label={`Seat ${index + 1} colour ${colour}`}
                    className={seat.colour === colour ? 'table-colour selected' : 'table-colour'}
                    data-testid={`table-seat-${index}-colour-${colour}`}
                    key={colour}
                    onClick={() => updateSeat(index, { colour })}
                    role="radio"
                    style={{ backgroundColor: colour }}
                    type="button"
                  />
                ))}
              </div>
            ) : null}
            {seat.kind !== 'empty' ? seatDetails?.(seat, index) : null}
          </article>
        ))}

        <div className="table-well">
          <div className="table-well-copy">
            <span className="table-well-kicker">Set the table</span>
            <h2>{meta.name}</h2>
            <p>
              {occupied} of {maxSeats} seats chosen
            </p>
          </div>
          {centreContent}
          {plan.status === 'invalid' ? (
            <p className="table-setup-hint" role="status">
              {plan.reason}
            </p>
          ) : null}
          <div className="table-setup-action">{action}</div>
        </div>
      </div>
    </section>
  );
}
