import { describe, expect, it } from 'vitest';
import { getYatzyActions } from './actions';

describe('getYatzyActions', () => {
  it('returns a primary roll action with yatzy-roll test id', () => {
    const [roll] = getYatzyActions({ rolls: 1, yourTurn: true });
    expect(roll).toMatchObject({
      id: 'roll',
      kind: 'roll',
      label: 'Roll (1/3)',
      variant: 'primary',
      testId: 'yatzy-roll',
      disabled: false,
    });
  });

  it('disables roll when no rolls remain', () => {
    const [roll] = getYatzyActions({ rolls: 3, yourTurn: true });
    expect(roll).toMatchObject({
      disabled: true,
      disabledReason: 'No rolls left this turn',
      label: 'Roll (3/3)',
    });
  });

  it('disables roll off-turn with a reason', () => {
    const [roll] = getYatzyActions({ rolls: 0, yourTurn: false });
    expect(roll).toMatchObject({
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
  });
});
