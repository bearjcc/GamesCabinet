/** Ephemeral turn resources (attack, influence / money, energy, …). */

export function gainResource(current: number, amount: number): number {
  if (amount <= 0) return current;
  return current + amount;
}

/** Spend `cost` if affordable; returns new total or null if not enough. */
export function trySpendResource(current: number, cost: number): number | null {
  if (cost < 0 || current < cost) return null;
  return current - cost;
}

export function resetResource(): number {
  return 0;
}
