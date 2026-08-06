import { type HTMLAttributes, type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { handleFocusTrapKeyDown, moveFocusInto, restoreFocus } from '../lib/focusTrap';

export type FocusTrapProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Called when Escape is pressed inside the trap. */
  onEscape?: () => void;
  /** When false, skip activate / restore behaviour. Default true. */
  active?: boolean;
};

/**
 * Container that traps Tab focus, moves focus in on mount, restores on unmount,
 * and optionally forwards Escape to `onEscape`.
 */
export function FocusTrap({ children, onEscape, active = true, ...rest }: FocusTrapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useFocusTrap(ref, { active, onEscapeRef });

  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
}

type TrapOptions = {
  active: boolean;
  onEscapeRef: RefObject<(() => void) | undefined>;
};

function useFocusTrap(ref: RefObject<HTMLElement | null>, { active, onEscapeRef }: TrapOptions) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    moveFocusInto(root);

    const onKeyDown = (event: KeyboardEvent) => {
      handleFocusTrapKeyDown(event, {
        root,
        activeElement: document.activeElement,
        onEscape: onEscapeRef.current,
      });
    };

    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
      restoreFocus(previous);
    };
  }, [active, onEscapeRef, ref]);
}
