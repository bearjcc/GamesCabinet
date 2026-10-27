import { describe, expect, it } from 'vitest';
import {
  namedTurnStatusLine,
  quietHintFromStatus,
  soloQuietHint,
  turnPlateFromMatchStatus,
  turnPlateHeadline,
} from './turnPlate';

describe('turnPlateHeadline', () => {
  it('never possessives “You”', () => {
    expect(turnPlateHeadline('You')).toBe('You');
    expect(turnPlateHeadline('Bear')).toBe("Bear's turn");
  });
});

describe('namedTurnStatusLine', () => {
  it('uses “Your turn” for the local seat label', () => {
    expect(namedTurnStatusLine('You')).toBe('Your turn');
    expect(namedTurnStatusLine('You', 'drop a disc')).toBe('Your turn — drop a disc');
    expect(namedTurnStatusLine('Bot')).toBe("Bot's turn");
  });
});

describe('turnPlateFromMatchStatus', () => {
  it('maps match status tone and hint for multiplayer', () => {
    const plate = turnPlateFromMatchStatus(
      { text: "Bear's turn — drop a disc", tone: 'you' },
      'Bear',
      { seatColour: '#ed9f18', mode: 'multiplayer' },
    );
    expect(plate).toMatchObject({
      headline: "Bear's turn",
      hint: 'drop a disc',
      tone: 'you',
      seatColour: '#ed9f18',
      initial: 'B',
    });
  });

  it('shows “You” with hint for vs-bot your-turn status', () => {
    const plate = turnPlateFromMatchStatus({ text: 'Your turn', tone: 'you' }, 'You', {
      hint: 'Drop a disc',
      seatColour: '#c92a2a',
    });
    expect(plate).toMatchObject({
      headline: 'You',
      hint: 'Drop a disc',
      tone: 'you',
      initial: 'Y',
    });
  });

  it('shows game-over result on the plate', () => {
    const plate = turnPlateFromMatchStatus({ text: 'Bot wins', tone: 'done' }, 'Bot', {
      seatColour: '#ed9f18',
    });
    expect(plate).toMatchObject({
      headline: 'Bot wins',
      tone: 'done',
      seatColour: '#ed9f18',
      initial: 'B',
    });
  });

  it('returns null for solo mode', () => {
    expect(
      turnPlateFromMatchStatus(
        { text: 'Drag cards. Double-click to send home.', tone: 'you' },
        'You',
        { mode: 'solo' },
      ),
    ).toBeNull();
  });

  it('parses hint after em dash without duplicating turn copy', () => {
    const plate = turnPlateFromMatchStatus(
      { text: "Red's turn — roll the dice", tone: 'wait' },
      'Fallback',
      { mode: 'multiplayer' },
    );
    expect(plate).toMatchObject({
      headline: "Red's turn",
      hint: 'roll the dice',
      tone: 'wait',
    });
  });

  it('uses colon status lines for name and hint', () => {
    const plate = turnPlateFromMatchStatus(
      { text: 'Bear: draw from the deck', tone: 'you' },
      'Bear',
      { mode: 'multiplayer' },
    );
    expect(plate).toMatchObject({
      headline: "Bear's turn",
      hint: 'draw from the deck',
    });
  });
});

describe('soloQuietHint', () => {
  it('trims and drops empty strings', () => {
    expect(soloQuietHint('  Tap to roll  ')).toBe('Tap to roll');
    expect(soloQuietHint('   ')).toBeUndefined();
  });
});

describe('quietHintFromStatus', () => {
  it('returns status text for active solo play', () => {
    expect(
      quietHintFromStatus({
        text: 'Drag cards. Double-click to send home.',
        tone: 'you',
      }),
    ).toBe('Drag cards. Double-click to send home.');
  });

  it('omits hint when the match is over', () => {
    expect(quietHintFromStatus({ text: 'You win', tone: 'done' })).toBeUndefined();
  });
});
