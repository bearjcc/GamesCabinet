import { describe, expect, it } from 'vitest';
import { quietHintFromStatus, soloQuietHint, turnPlateFromMatchStatus } from './turnPlate';

describe('turnPlateFromMatchStatus', () => {
  it('maps match status tone and hint for multiplayer', () => {
    const plate = turnPlateFromMatchStatus(
      { text: "Bear's turn — drop a disc", tone: 'you' },
      'Bear',
      { seatColour: '#ed9f18', mode: 'multiplayer' },
    );
    expect(plate).toMatchObject({
      name: 'Bear',
      hint: 'drop a disc',
      tone: 'you',
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
      name: 'Red',
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
      name: 'Bear',
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
