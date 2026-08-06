import {
  actionAriaLabel,
  actionTitle,
  isActionInteractive,
  resolveActionState,
  type SemanticAction,
} from '../lib/actions';

export type ActionSurfaceItem = SemanticAction & {
  onAction: () => void;
};

/** Thumb-friendly shared controls for semantic game intents. */
export function ActionSurface({
  actions,
  label = 'Game actions',
}: {
  actions: ActionSurfaceItem[];
  label?: string;
}) {
  if (!actions.length) return null;

  return (
    <div className="action-surface" role="group" aria-label={label} data-testid="action-surface">
      {actions.map((action) => {
        const state = resolveActionState(action);
        const interactive = isActionInteractive(action);
        const variantClass =
          action.variant === 'primary'
            ? ' primary'
            : action.variant === 'ghost'
              ? ' ghost'
              : action.variant === 'secondary'
                ? ' secondary'
                : '';
        return (
          <button
            key={action.id}
            type="button"
            className={`btn action-surface__btn${variantClass}`}
            data-action-kind={action.kind}
            data-action-state={state}
            data-testid={action.testId ?? `action-${action.id}`}
            disabled={!interactive}
            title={actionTitle(action)}
            aria-label={actionAriaLabel(action)}
            onClick={() => {
              if (interactive) action.onAction();
            }}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
