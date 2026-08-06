/** Standard six-sided die face. Non-d6 dice are out of scope for this kit. */
export type DieFaceValue = 1 | 2 | 3 | 4 | 5 | 6;

/** Slot map: override art for specific faces without forking DieFace. */
export type DieFaceArtMap = Partial<Record<DieFaceValue, string>>;

export function isDieFaceValue(n: number): n is DieFaceValue {
  return Number.isInteger(n) && n >= 1 && n <= 6;
}

/** Coerce a raw die value; out-of-range falls back to 1. */
export function asDieFaceValue(n: number): DieFaceValue {
  return isDieFaceValue(n) ? n : 1;
}
