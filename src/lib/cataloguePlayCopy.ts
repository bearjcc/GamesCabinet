import type { GameMeta } from './games';

export function playerCountLabel(meta: GameMeta): string {
  if (meta.soloOnly) return '1';
  if (meta.minPlayers === meta.maxPlayers) return String(meta.minPlayers);
  return `${meta.minPlayers}–${meta.maxPlayers}`;
}

export function cataloguePlayTags(meta: GameMeta): string[] {
  const tags: string[] = [];
  if (meta.soloOnly) {
    tags.push('1 player');
    if (meta.hasLeaderboard) tags.push('Solo scores');
    return tags;
  }
  tags.push(`${playerCountLabel(meta)} players`);
  if (meta.hasLocal && meta.hasOnline !== false && meta.maxPlayers >= 2) {
    tags.push('Same screen or online');
  } else if (meta.hasLocal) {
    tags.push('Same screen');
  }
  if (meta.hasBot) tags.push('Bot available');
  return tags;
}
