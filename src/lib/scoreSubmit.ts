import type { SubmitScoreInput } from './scores';
import { submitScore } from './scores';
import { getNickname } from './storage';

export function pendingSubmitKey(input: SubmitScoreInput): string {
  return `${input.score}-${input.moves ?? ''}-${input.puzzleNumber ?? ''}-${input.playerName ?? ''}`;
}

export function normaliseSubmitPayload(input: SubmitScoreInput): SubmitScoreInput {
  return {
    ...input,
    playerName: input.playerName?.trim() || getNickname().trim() || 'Anonymous',
  };
}

export type PendingSubmitDecision =
  | { action: 'skip' }
  | { action: 'post'; key: string; payload: SubmitScoreInput };

/** Decide whether a pending score should be posted (dedupes by key). */
export function decidePendingSubmit(
  pendingSubmit: SubmitScoreInput | null | undefined,
  postedKey: string | null,
): PendingSubmitDecision {
  if (!pendingSubmit) return { action: 'skip' };
  const key = pendingSubmitKey(pendingSubmit);
  if (postedKey === key) return { action: 'skip' };
  return { action: 'post', key, payload: normaliseSubmitPayload(pendingSubmit) };
}

export async function postPendingScore(gameId: string, input: SubmitScoreInput): Promise<void> {
  await submitScore(gameId, normaliseSubmitPayload(input));
}
