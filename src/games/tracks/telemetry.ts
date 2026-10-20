/** Counters for headless sim diagnosis (reset per game). */
export type TurnTelemetry = {
  draws: number;
  discards: number;
  placeExtend: number;
  placeStall: number;
  connects: number;
  illegalAttempts: number;
  playTurns: number;
};

export function emptyTelemetry(): TurnTelemetry {
  return {
    draws: 0,
    discards: 0,
    placeExtend: 0,
    placeStall: 0,
    connects: 0,
    illegalAttempts: 0,
    playTurns: 0,
  };
}
