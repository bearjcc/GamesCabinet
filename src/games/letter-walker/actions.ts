import type { SemanticAction } from '../../lib/actions';

export type LetterWalkerActionInput = {
  playable: boolean;
  boardTab: 'play' | 'scores';
  selectedCount: number;
  wordLength: number;
  dictReady: boolean;
};

/**
 * Pure pew intents for Letter Walker.
 *
 * Row/column slides are 32 microscopic arrow intents plus per-cell selection;
 * those stay on the board (drag/tap/arrow buttons). The pew exposes the
 * high-value intents the existing toolbar already offered: submit, clear,
 * and new puzzle.
 */
export function getLetterWalkerActions({
  playable,
  boardTab,
  selectedCount,
  wordLength,
  dictReady,
}: LetterWalkerActionInput): SemanticAction[] {
  const onScores = boardTab === 'scores';

  let submitDisabled = false;
  let submitReason: string | undefined;
  if (onScores) {
    submitDisabled = true;
    submitReason = 'Switch to the Play tab';
  } else if (!playable) {
    submitDisabled = true;
    submitReason = 'Puzzle complete';
  } else if (!dictReady) {
    submitDisabled = true;
    submitReason = 'Loading dictionary';
  } else if (wordLength < 3) {
    submitDisabled = true;
    submitReason = 'Select a word of at least 3 letters';
  }

  let clearDisabled = false;
  let clearReason: string | undefined;
  if (onScores) {
    clearDisabled = true;
    clearReason = 'Switch to the Play tab';
  } else if (selectedCount === 0) {
    clearDisabled = true;
    clearReason = 'No selection to clear';
  }

  let newDisabled = false;
  let newReason: string | undefined;
  if (onScores) {
    newDisabled = true;
    newReason = 'Switch to the Play tab';
  }

  return [
    {
      id: 'submit',
      kind: 'confirm',
      label: 'Submit',
      variant: 'primary',
      disabled: submitDisabled,
      disabledReason: submitReason,
      testId: 'lw-action-submit',
    },
    {
      id: 'clear',
      kind: 'dismiss',
      label: 'Clear',
      variant: 'secondary',
      disabled: clearDisabled,
      disabledReason: clearReason,
      testId: 'lw-action-clear',
    },
    {
      id: 'new-puzzle',
      kind: 'choose',
      label: 'New puzzle',
      variant: 'secondary',
      disabled: newDisabled,
      disabledReason: newReason,
      testId: 'lw-action-new-puzzle',
    },
  ];
}
