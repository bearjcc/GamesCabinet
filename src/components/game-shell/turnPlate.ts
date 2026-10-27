import type { MatchStatus } from '../../lib/matchStatus';
import type { TurnPlateModel, TurnPlateTone } from './types';

export function parseActorFromTurnStatus(text: string): string | null {
  const trimmed = text.trim();
  const possessive = /^(.+?)'s turn\b/i.exec(trimmed);
  if (possessive?.[1]?.trim()) return possessive[1].trim();
  const yourTurn = /^your turn\b/i.exec(trimmed);
  if (yourTurn) return 'You';
  return null;
}

function toneFromStatus(tone: MatchStatus['tone']): TurnPlateTone {
  return tone === 'you' || tone === 'wait' || tone === 'done' ? tone : 'neutral';
}

function hintFromStatusText(text: string, explicit?: string): string | undefined {
  if (explicit?.trim()) return explicit.trim();
  const colon = /^[^:]+:\s*(.+)$/.exec(text.trim());
  if (colon?.[1]?.trim()) return colon[1].trim();
  const dash = /^[^—–-]+[—–-]\s*(.+)$/.exec(text.trim());
  return dash?.[1]?.trim();
}

/** Multiplayer centre plate: “{name}'s turn” plus optional hint. */
export function multiplayerTurnPlate(
  actorName: string,
  options: {
    hint?: string;
    tone: TurnPlateTone;
    seatColour?: string;
    initial?: string;
  },
): TurnPlateModel {
  const name = actorName.trim();
  return {
    name,
    hint: options.hint?.trim() || undefined,
    tone: options.tone,
    seatColour: options.seatColour,
    initial: options.initial ?? (name ? name.charAt(0).toUpperCase() : '?'),
  };
}

/** Solo / puzzle games: hint copy under the title, not a turn plate. */
export function soloQuietHint(message: string | undefined): string | undefined {
  const trimmed = message?.trim();
  return trimmed || undefined;
}

export function quietHintFromStatus(status: MatchStatus, explicit?: string): string | undefined {
  if (status.tone === 'done') return undefined;
  return soloQuietHint(explicit ?? status.text);
}

export function turnPlateFromMatchStatus(
  status: MatchStatus,
  actorName: string,
  options?: {
    seatColour?: string;
    hint?: string;
    initial?: string;
    mode?: 'solo' | 'multiplayer';
  },
): TurnPlateModel | null {
  if (options?.mode === 'solo') return null;
  const name = parseActorFromTurnStatus(status.text) ?? actorName.trim();
  const hint = hintFromStatusText(status.text, options?.hint);
  return multiplayerTurnPlate(name, {
    hint,
    tone: toneFromStatus(status.tone),
    seatColour: options?.seatColour,
    initial: options?.initial,
  });
}
