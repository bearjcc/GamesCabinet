/** Fresh Local match id so vs-bot rematch does not call Client.reset(). */
export function localRematchMatchID(base: string, generation: number): string {
  return generation === 0 ? base : `${base}-r${generation}`;
}
