import type { MatchStatus } from '../../lib/matchStatus';
import type { TurnPlateModel, TurnPlateTone } from './types';

export function isLocalYouLabel(name: string): boolean {
  return name.trim().toLowerCase() === 'you';
}

/** Status / info line: “Your turn” for the local seat, “{name}'s turn” otherwise. */
export function namedTurnStatusLine(actorName: string, hint?: string): string {
  const name = actorName.trim();
  const base = isLocalYouLabel(name) ? 'Your turn' : `${name}'s turn`;
  const trimmedHint = hint?.trim();
  return trimmedHint ? `${base} — ${trimmedHint}` : base;
}

/** Centre plate title during play (not possessive for “You”). */
export function turnPlateHeadline(actorName: string): string {
  const name = actorName.trim();
  if (isLocalYouLabel(name)) return 'You';
  return `${name}'s turn`;
}

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

function initialFromHeadline(headline: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim().charAt(0).toUpperCase();
  const trimmed = headline.trim();
  if (!trimmed) return '?';
  if (/^draw$/i.test(trimmed)) return '=';
  const youWin = /^you win$/i.test(trimmed);
  if (youWin) return 'Y';
  const wins = /^(.+?)\s+wins$/i.exec(trimmed);
  if (wins?.[1]?.trim()) return wins[1].trim().charAt(0).toUpperCase();
  return trimmed.charAt(0).toUpperCase();
}

/** Multiplayer centre plate: headline plus optional hint. */
export function multiplayerTurnPlate(
  actorName: string,
  options: {
    hint?: string;
    tone: TurnPlateTone;
    seatColour?: string;
    initial?: string;
    headline?: string;
  },
): TurnPlateModel {
  const name = actorName.trim();
  const headline = options.headline?.trim() || turnPlateHeadline(name);
  return {
    headline,
    hint: options.hint?.trim() || undefined,
    tone: options.tone,
    seatColour: options.seatColour,
    initial: options.initial ?? initialFromHeadline(headline, name),
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

  const tone = toneFromStatus(status.tone);

  if (status.tone === 'done') {
    const headline = status.text.trim();
    return {
      headline,
      tone: 'done',
      seatColour: options?.seatColour,
      initial: options?.initial ?? initialFromHeadline(headline, actorName),
    };
  }

  const name = parseActorFromTurnStatus(status.text) ?? actorName.trim();
  const hint = hintFromStatusText(status.text, options?.hint);
  return multiplayerTurnPlate(name, {
    hint,
    tone,
    seatColour: options?.seatColour,
    initial: options?.initial,
  });
}
