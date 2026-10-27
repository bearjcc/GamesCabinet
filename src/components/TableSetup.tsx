import { type CSSProperties, type ReactNode, useMemo, useRef } from 'react';
import { usesLaunchSeatColours } from '../lib/gameIdentity';
import type { GameMeta } from '../lib/games';
import { nextSeatColour } from '../lib/seatColours';
import { isSeatColour } from '../lib/storage';
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

function spotKindShort(kind: Exclude<SeatKind, 'empty'>, seatIndex: number): string {
  if (kind === 'local' && seatIndex > 0) {
    return `Player ${seatIndex + 1}`;
  }
  return KIND_SHORT[kind];
}

const LONG_PRESS_MS = 500;

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
  const showSeatColours = usesLaunchSeatColours(meta.id);
  const pressTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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

  function onColourTap(index: number) {
    if (!showSeatColours) return;
    const seat = boundedSeats[index];
    if (!seat || seat.kind === 'empty' || seat.kind === 'online') return;
    const next = nextSeatColour(isSeatColour(seat.colour) ? seat.colour : undefined, meta.id);
    updateSeat(index, { colour: next });
  }

  function clearPressTimer(index: number) {
    const timer = pressTimers.current.get(index);
    if (timer) {
      clearTimeout(timer);
      pressTimers.current.delete(index);
    }
  }

  function onPiecePointerDown(index: number) {
    clearPressTimer(index);
    if (!allowedKinds.includes('online')) return;
    const timer = setTimeout(() => {
      pressTimers.current.delete(index);
      applyKind(index, 'online');
    }, LONG_PRESS_MS);
    pressTimers.current.set(index, timer);
  }

  function onPiecePointerUp(index: number) {
    clearPressTimer(index);
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
            {seat.kind === 'empty' ? (
              <button
                aria-label={`Seat ${index + 1}, open. Tap to sit here.`}
                className="table-spot-piece"
                data-testid={`table-seat-${index}-piece`}
                onClick={() => onSpotTap(index)}
                type="button"
              >
                <span aria-hidden className="table-spot-ring" />
              </button>
            ) : (
              <div className="table-spot-piece">
                <button
                  aria-label={`Seat ${index + 1}, ${KIND_LABELS[seat.kind]}. Tap to change. Long press for online.`}
                  className="table-spot-ring-btn"
                  data-testid={`table-seat-${index}-piece`}
                  onClick={() => onSpotTap(index)}
                  onPointerCancel={() => onPiecePointerUp(index)}
                  onPointerDown={() => onPiecePointerDown(index)}
                  onPointerLeave={() => onPiecePointerUp(index)}
                  onPointerUp={() => onPiecePointerUp(index)}
                  type="button"
                >
                  <span aria-hidden className="table-spot-ring is-filled" />
                </button>
                <button
                  aria-label={
                    showSeatColours
                      ? `Seat ${index + 1} colour. Tap to change.`
                      : `Seat ${index + 1}`
                  }
                  className="table-spot-token-btn"
                  data-testid={`table-seat-${index}-colour`}
                  disabled={!showSeatColours}
                  onClick={() => onColourTap(index)}
                  type="button"
                >
                  <span
                    className="table-spot-token"
                    style={
                      showSeatColours && isSeatColour(seat.colour)
                        ? ({ '--seat-colour': seat.colour } as CSSProperties)
                        : undefined
                    }
                  >
                    <Token
                      label={`Seat ${index + 1}`}
                      player={String(index)}
                      size="lg"
                      testId={`table-seat-${index}-token`}
                      variant="disc"
                    />
                  </span>
                </button>
              </div>
            )}

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
                  {spotKindShort(seat.kind, index)}
                </button>
              )}
            </div>

            {seat.kind !== 'empty' ? seatDetails?.(seat, index) : null}

            {allowedKinds
              .filter((kind) => kind !== 'empty')
              .map((kind) => (
                <button
                  aria-label={`Set seat ${index + 1} to ${KIND_LABELS[kind]}`}
                  className="table-spot-kind-hook sr-only"
                  data-testid={`table-seat-${index}-kind-${kind}`}
                  key={kind}
                  onClick={() => applyKind(index, kind)}
                  type="button"
                />
              ))}
          </article>
        ))}

        <div className="table-well">
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
