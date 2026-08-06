/** Elements that can receive keyboard focus inside a trap. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function isFocusableCandidate(el: HTMLElement): boolean {
  if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
  if (el.tabIndex < 0) return false;
  return true;
}

export function listFocusable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isFocusableCandidate,
  );
}

export function getInitialFocusTarget(root: HTMLElement): HTMLElement {
  return listFocusable(root)[0] ?? root;
}

/**
 * When Tab / Shift+Tab would leave the trap, return the element that should
 * receive focus. Otherwise return null and let the browser move within the list.
 */
export function resolveTabWrap(
  focusables: readonly HTMLElement[],
  active: Element | null,
  shiftKey: boolean,
): HTMLElement | null {
  if (focusables.length === 0) return null;

  const first = focusables[0]!;
  const last = focusables[focusables.length - 1]!;

  if (focusables.length === 1) return first;

  const activeInTrap = active instanceof HTMLElement && focusables.includes(active);

  if (shiftKey) {
    if (!activeInTrap || active === first) return last;
    return null;
  }

  if (!activeInTrap || active === last) return first;
  return null;
}

export type FocusTrapKeyOptions = {
  root: HTMLElement;
  activeElement: Element | null;
  onEscape?: () => void;
};

export function handleFocusTrapKeyDown(
  event: { key: string; shiftKey: boolean; preventDefault: () => void },
  { root, activeElement, onEscape }: FocusTrapKeyOptions,
): void {
  if (event.key === 'Escape') {
    if (onEscape) {
      event.preventDefault();
      onEscape();
    }
    return;
  }

  if (event.key !== 'Tab') return;

  const focusables = listFocusable(root);
  if (focusables.length === 0) {
    event.preventDefault();
    root.focus();
    return;
  }

  const next = resolveTabWrap(focusables, activeElement, event.shiftKey);
  if (next) {
    event.preventDefault();
    next.focus();
  }
}

/** Ensure the trap root can hold focus, then move into the first control (or root). */
export function moveFocusInto(root: HTMLElement): HTMLElement {
  if (!root.hasAttribute('tabindex')) {
    root.tabIndex = -1;
  }
  const target = getInitialFocusTarget(root);
  target.focus();
  return target;
}

export function restoreFocus(previouslyFocused: HTMLElement | null): void {
  if (!previouslyFocused?.isConnected) return;
  previouslyFocused.focus();
}
