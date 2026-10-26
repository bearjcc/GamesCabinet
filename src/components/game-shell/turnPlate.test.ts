import { describe, expect, it } from 'vitest';
import { turnPlateFromMatchStatus } from './turnPlate';

describe('turnPlateFromMatchStatus', () => {
  it('maps match status tone and hint', () => {
    const plate = turnPlateFromMatchStatus(
      { text: "Bear's turn — drop a disc", tone: 'you' },
      'Bear',
      { seatColour: '#ed9f18' },
    );
    expect(plate).toMatchObject({
      name: 'Bear',
      hint: 'drop a disc',
      tone: 'you',
      seatColour: '#ed9f18',
      initial: 'B',
    });
  });
});
