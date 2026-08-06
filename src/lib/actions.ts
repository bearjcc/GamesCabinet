export const ACTION_KINDS = [
  'select',
  'choose',
  'confirm',
  'roll',
  'move',
  'draw',
  'inspect',
  'dismiss',
] as const;

export type ActionKind = (typeof ACTION_KINDS)[number];

export type ActionControlState = 'idle' | 'pending' | 'disabled' | 'error' | 'success';

export type ActionVariant = 'primary' | 'secondary' | 'ghost';

/** Pure description of a game intent for the shared mobile action surface. */
export type SemanticAction = {
  id: string;
  kind: ActionKind;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  state?: ActionControlState;
  variant?: ActionVariant;
  testId?: string;
};

export function isActionKind(value: string | null | undefined): value is ActionKind {
  return !!value && (ACTION_KINDS as readonly string[]).includes(value);
}

export function resolveActionState(action: SemanticAction): ActionControlState {
  if (action.state) return action.state;
  if (action.disabled) return 'disabled';
  return 'idle';
}

export function isActionInteractive(action: SemanticAction): boolean {
  const state = resolveActionState(action);
  return state !== 'pending' && state !== 'disabled';
}

export function actionTitle(action: SemanticAction): string | undefined {
  if (resolveActionState(action) === 'disabled' && action.disabledReason) {
    return action.disabledReason;
  }
  return undefined;
}

export function actionAriaLabel(action: SemanticAction): string {
  const reason = actionTitle(action);
  return reason ? `${action.label}. ${reason}` : action.label;
}
