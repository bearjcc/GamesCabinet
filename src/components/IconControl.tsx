import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type IconControlBase = {
  label: string;
  title?: string;
  className?: string;
  testId?: string;
  children: ReactNode;
};

type IconButtonProps = IconControlBase & {
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  'aria-expanded'?: boolean;
};

type IconLinkProps = IconControlBase & {
  to: string;
};

function classes(extra?: string, pressed?: boolean): string {
  const base = 'icon-control btn ghost';
  const state = pressed ? ' is-pressed' : '';
  return extra ? `${base}${state} ${extra}` : `${base}${state}`;
}

/** Compact icon-only control sized for touch targets. */
export function IconButton({
  label,
  title,
  className,
  testId,
  children,
  onClick,
  disabled,
  pressed,
  'aria-expanded': ariaExpanded,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={classes(className, pressed)}
      data-testid={testId}
      aria-label={label}
      title={title ?? label}
      aria-pressed={pressed}
      aria-expanded={ariaExpanded}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Icon-only navigation control. */
export function IconLink({ label, title, className, testId, children, to }: IconLinkProps) {
  return (
    <Link
      to={to}
      className={classes(className)}
      data-testid={testId}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </Link>
  );
}
