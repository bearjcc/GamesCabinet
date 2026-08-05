export type ScoreEntry = {
  id: string;
  gameId: string;
  playerName: string;
  score: number;
  moves?: number;
  wordsFound?: number;
  puzzleNumber?: number;
  datePlayed: string;
  meta?: Record<string, unknown>;
};

export type SubmitScoreInput = {
  playerName?: string;
  score: number;
  moves?: number;
  wordsFound?: number;
  puzzleNumber?: number;
  meta?: Record<string, unknown>;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Scores request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function submitScore(gameId: string, body: SubmitScoreInput): Promise<ScoreEntry> {
  const res = await fetch(`/api/scores/${encodeURIComponent(gameId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ success: boolean; score: ScoreEntry }>(res);
  return data.score;
}

export async function fetchScores(
  gameId: string,
  scope: 'all' | 'daily' = 'all',
): Promise<ScoreEntry[]> {
  const path =
    scope === 'daily'
      ? `/api/scores/${encodeURIComponent(gameId)}/daily`
      : `/api/scores/${encodeURIComponent(gameId)}`;
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  const data = await parseJson<{ success: boolean; scores: ScoreEntry[] }>(res);
  return Array.isArray(data.scores) ? data.scores : [];
}
