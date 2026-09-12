import { type ReactNode, useMemo } from 'react';
import type { GameMeta } from '../lib/games';
import {
  deriveLaunch,
  getSeatKinds,
  nextSeatKind,
  type SeatKind,
  type TableSeat,
} from '../lib/tableSetup';
import { Token } from './tabletop/Token';

type Props = {
  meta: GameMeta;
  seats: TableSeat[];
  onChange: (seats: TableSeat[]) => void;
  maxSeats?: number;
  centreContent?: ReactNode;
  action: ReactNode;
  seatDetails?: (seat: TableSeat, index: number) => ReactNode;
};

const KIND_LABELS: Record<Exclude<SeatKind, 'empty'>, string> = {
  local: 'This device',
  online: 'Online',
  bot: 'Bot',
};

const KIND_SHORT: Record<Exclude<SeatKind, 'empty'>, string> = {
  local: 'You',
  online: 'Join',
  bot: 'Bot',
};

export function TableSetup({
  meta,
  seats,
  onChange,
  maxSeats = meta.maxPlayers,
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

  function applyKind(index: number, kind: SeatKind) {
    if (!allowedKinds.includes(kind)) return;
    updateSeat(index, {
      kind,
      ...(kind === 'empty' ? { colour: undefined } : {}),
    });
  }

  function onSpotTap(index: number) {
    const seat = boundedSeats[index];
    if (!seat) return;
    const nextKind = nextSeatKind(meta, seat.kind, { claim: seat.kind === 'empty' });
    applyKind(index, nextKind);
  }

  function onKindTap(index: number) {
    const seat = boundedSeats[index];
    if (!seat || seat.kind === 'empty') return;
    applyKind(index, nextSeatKind(meta, seat.kind));
  }

  return (
    <section className="table-setup launch-modes" data-testid="launch-modes">
      <div className={`table-stage table-stage-${boundedSeats.length}`}>
        {boundedSeats.map((seat, index) => (
          <article
            className={`table-spot table-spot-${index}${seat.kind === 'empty' ? ' is-open' : ''}`}
            data-seat-kind={seat.kind}
            data-testid={`table-seat-${index}`}
            key={index}
          >
            <button
              aria-label={
                seat.kind === 'empty'
                  ? `Seat ${index + 1}, open. Tap to sit here.`
                  : `Seat ${index + 1}, ${KIND_LABELS[seat.kind]}. Tap to change.`
              }
              className="table-spot-piece"
              data-testid={`table-seat-${index}-piece`}
              onClick={() => onSpotTap(index)}
              type="button"
            >
              {seat.kind === 'empty' ? (
                <span aria-hidden className="table-spot-ring" />
              ) : (
                <Token
                  label={`Seat ${index + 1}`}
                  player={String(index)}
                  size="lg"
                  testId={`table-seat-${index}-token`}
                  variant="disc"
                />
              )}
            </button>

            <div className="table-spot-copy">
              <span className="table-spot-seat">Seat {index + 1}</span>
              {seat.kind === 'empty' ? (
                <span className="table-spot-status">Open</span>
              ) : (
                <button
                  aria-label={`Seat ${index + 1} type, ${KIND_LABELS[seat.kind]}. Tap to change.`}
                  className="table-spot-kind"
                  data-testid={`table-seat-${index}-kind`}
                  onClick={() => onKindTap(index)}
                  type="button"
                >
                  {KIND_SHORT[seat.kind]}
                </button>
              )}
            </div>

            {seat.kind !== 'empty' ? seatDetails?.(seat, index) : null}

            {allowedKinds
              .filter((kind) => kind !== 'empty')
              .map((kind) => (
                <button
                  aria-hidden={seat.kind !== kind}
                  className="table-spot-kind-hook"
                  data-testid={`table-seat-${index}-kind-${kind}`}
                  key={kind}
                  onClick={() => applyKind(index, kind)}
                  tabIndex={-1}
                  type="button"
                />
              ))}
          </article>
        ))}

        <div className="table-well">
          <div className="table-well-copy">
            <h2>{meta.name}</h2>
            <p>
              {occupied} of {maxSeats} seats taken
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
