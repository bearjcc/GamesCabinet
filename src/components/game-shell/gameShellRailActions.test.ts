import { describe, expect, it } from 'vitest';
import { shellSheetActions } from './gameShellRailActions';

describe('shellSheetActions', () => {
  it('marks the open sheet as pressed', () => {
    const actions = shellSheetActions('rules', { onRules: () => undefined });
    expect(actions.find((a) => a.id === 'rules')?.pressed).toBe(true);
    expect(actions.find((a) => a.id === 'scores')?.pressed).toBe(false);
  });
});
