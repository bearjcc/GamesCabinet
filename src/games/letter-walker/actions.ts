import type { SemanticAction } from '../../lib/actions';

export type LetterWalkerActionInput = {
  playable: boolean;
  selectedCount: number;
  wordLength: number;
  dictReady: boolean;
};

/**
 * Pure pew intents for Letter Walker.
 *
 * Row/column slides are drag on the board. The pew exposes submit, clear,
 * and new puzzle. The shell hides this surface on the scores tab.
 */
export function getLetterWalkerActions({
  playable,
  selectedCount,
  wordLength,
  dictReady,
}: LetterWalkerActionInput): SemanticAction[] {
  let submitDisabled = false;
  let submitReason: string | undefined;
  if (!playable) {
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
  if (selectedCount === 0) {
    clearDisabled = true;
    clearReason = 'No selection to clear';
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
      disabled: false,
      testId: 'lw-action-new-puzzle',
    },
  ];
}
