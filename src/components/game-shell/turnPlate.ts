import type { MatchStatus } from '../../lib/matchStatus';
import type { TurnPlateModel, TurnPlateTone } from './types';

export function turnPlateFromMatchStatus(
  status: MatchStatus,
  name: string,
  options?: { seatColour?: string; hint?: string; initial?: string },
): TurnPlateModel {
  const tone: TurnPlateTone =
    status.tone === 'you' || status.tone === 'wait' || status.tone === 'done'
      ? status.tone
      : 'neutral';
  const hint =
    options?.hint ??
    (() => {
      const dash = /^[^—–-]+[—–-]\s*(.+)$/.exec(status.text);
      return dash?.[1]?.trim();
    })();
  return {
    name,
    hint,
    tone,
    seatColour: options?.seatColour,
    initial: options?.initial ?? name.charAt(0).toUpperCase(),
  };
}
