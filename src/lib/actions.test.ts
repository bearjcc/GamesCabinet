import { describe, expect, it } from 'vitest';
import {
  ACTION_KINDS,
  actionAriaLabel,
  actionTitle,
  controlA11y,
  isActionInteractive,
  isActionKind,
  resolveActionState,
  type SemanticAction,
} from './actions';

describe('semantic actions', () => {
  it('lists the cabinet interaction vocabulary', () => {
    expect(ACTION_KINDS).toEqual([
      'select',
      'choose',
      'confirm',
      'roll',
      'move',
      'draw',
      'inspect',
      'dismiss',
    ]);
  });

  it('validates action kinds', () => {
    expect(isActionKind('roll')).toBe(true);
    expect(isActionKind('teleport')).toBe(false);
    expect(isActionKind(null)).toBe(false);
  });

  it('resolves control state from explicit state or disabled flag', () => {
    const base: SemanticAction = { id: 'roll', kind: 'roll', label: 'Roll' };
    expect(resolveActionState(base)).toBe('idle');
    expect(resolveActionState({ ...base, disabled: true })).toBe('disabled');
    expect(resolveActionState({ ...base, state: 'pending' })).toBe('pending');
    expect(resolveActionState({ ...base, disabled: true, state: 'success' })).toBe('success');
  });

  it('treats pending and disabled actions as non-interactive', () => {
    const base: SemanticAction = { id: 'roll', kind: 'roll', label: 'Roll' };
    expect(isActionInteractive(base)).toBe(true);
    expect(isActionInteractive({ ...base, disabled: true })).toBe(false);
    expect(isActionInteractive({ ...base, state: 'pending' })).toBe(false);
    expect(isActionInteractive({ ...base, state: 'error' })).toBe(true);
  });

  it('surfaces disabled reasons as titles and aria labels', () => {
    const action: SemanticAction = {
      id: 'roll',
      kind: 'roll',
      label: 'Roll',
      disabled: true,
      disabledReason: 'No rolls left',
    };
    expect(actionTitle(action)).toBe('No rolls left');
    expect(actionAriaLabel(action)).toBe('Roll. No rolls left');
    expect(actionTitle({ id: 'ok', kind: 'confirm', label: 'OK' })).toBeUndefined();
    expect(actionAriaLabel({ id: 'ok', kind: 'confirm', label: 'OK' })).toBe('OK');
  });

  it('builds control a11y for board taps and pew buttons alike', () => {
    expect(controlA11y({ label: 'Drop column 1' })).toEqual({
      title: undefined,
      ariaLabel: 'Drop column 1',
    });
    expect(
      controlA11y({
        label: 'Drop column 1',
        disabled: true,
        disabledReason: 'Column full',
      }),
    ).toEqual({
      title: 'Column full',
      ariaLabel: 'Drop column 1. Column full',
    });
    expect(controlA11y({ label: 'Drop', disabled: true })).toEqual({
      title: undefined,
      ariaLabel: 'Drop',
    });
  });
});
