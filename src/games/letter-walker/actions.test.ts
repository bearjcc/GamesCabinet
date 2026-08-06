import { describe, expect, it } from 'vitest';
import { getLetterWalkerActions } from './actions';

const readyPlay = {
  playable: true,
  boardTab: 'play' as const,
  selectedCount: 4,
  wordLength: 4,
  dictReady: true,
};

describe('getLetterWalkerActions', () => {
  it('returns submit, clear, and new-puzzle intents with lw-action-* test ids', () => {
    const actions = getLetterWalkerActions(readyPlay);
    expect(actions.map((a) => a.id)).toEqual(['submit', 'clear', 'new-puzzle']);
    expect(actions.map((a) => a.testId)).toEqual([
      'lw-action-submit',
      'lw-action-clear',
      'lw-action-new-puzzle',
    ]);
    expect(actions[0]).toMatchObject({
      kind: 'confirm',
      label: 'Submit',
      variant: 'primary',
      disabled: false,
    });
    expect(actions[1]).toMatchObject({
      kind: 'dismiss',
      label: 'Clear',
      variant: 'secondary',
      disabled: false,
    });
    expect(actions[2]).toMatchObject({
      kind: 'choose',
      label: 'New puzzle',
      variant: 'secondary',
      disabled: false,
    });
  });

  it('disables all intents on the scores tab with a reason', () => {
    const actions = getLetterWalkerActions({ ...readyPlay, boardTab: 'scores' });
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Switch to the Play tab');
    }
  });

  it('disables submit when the puzzle is complete', () => {
    const [submit] = getLetterWalkerActions({ ...readyPlay, playable: false });
    expect(submit).toMatchObject({
      disabled: true,
      disabledReason: 'Puzzle complete',
    });
  });

  it('disables submit until a long enough word is selected', () => {
    const [submit] = getLetterWalkerActions({
      ...readyPlay,
      selectedCount: 2,
      wordLength: 2,
    });
    expect(submit).toMatchObject({
      disabled: true,
      disabledReason: 'Select a word of at least 3 letters',
    });
  });

  it('disables submit while the dictionary is loading', () => {
    const [submit] = getLetterWalkerActions({ ...readyPlay, dictReady: false });
    expect(submit).toMatchObject({
      disabled: true,
      disabledReason: 'Loading dictionary',
    });
  });

  it('disables clear when there is no selection', () => {
    const actions = getLetterWalkerActions({
      ...readyPlay,
      selectedCount: 0,
      wordLength: 0,
    });
    const clear = actions.find((a) => a.id === 'clear');
    expect(clear).toMatchObject({
      disabled: true,
      disabledReason: 'No selection to clear',
    });
  });

  it('keeps new puzzle enabled after completion on the play tab', () => {
    const actions = getLetterWalkerActions({ ...readyPlay, playable: false });
    const next = actions.find((a) => a.id === 'new-puzzle');
    expect(next).toMatchObject({ disabled: false });
  });
});
