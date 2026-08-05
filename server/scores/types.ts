export type ScoreRecord = {
  id: string;
  gameId: string;
  playerName: string;
  score: number;
  moves?: number;
  wordsFound?: number;
  puzzleNumber?: number;
  datePlayed: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export type ScoreInput = {
  playerName?: string;
  score: number;
  moves?: number;
  wordsFound?: number;
  puzzleNumber?: number;
  meta?: Record<string, unknown>;
};

export type ScoresStoreFile = {
  scores: ScoreRecord[];
};
