import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type MatchAction = {
  id: string;
  label: string;
  onClick?: () => void;
  to?: string;
  variant?: 'primary' | 'ghost' | 'default';
  disabled?: boolean;
};

export function MatchActions({
  actions,
  busy = false,
  children,
}: {
  actions: MatchAction[];
  busy?: boolean;
  children?: ReactNode;
}) {
  if (!actions.length && !children) return null;
  return (
    <div className="action-row match-actions" role="group" aria-label="Match actions">
      {actions.map((a) => {
        const className = `btn${a.variant === 'primary' ? ' primary' : a.variant === 'ghost' ? ' ghost' : ''}`;
        if (a.to) {
          return (
            <Link key={a.id} className={className} to={a.to} data-testid={`match-action-${a.id}`}>
              {a.label}
            </Link>
          );
        }
        return (
          <button
            key={a.id}
            type="button"
            className={className}
            disabled={busy || a.disabled}
            data-testid={`match-action-${a.id}`}
            onClick={a.onClick}
          >
            {a.label}
          </button>
        );
      })}
      {children}
    </div>
  );
}
