// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getInitialFocusTarget,
  handleFocusTrapKeyDown,
  listFocusable,
  moveFocusInto,
  resolveTabWrap,
  restoreFocus,
} from './focusTrap';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function mountTrap(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

describe('listFocusable', () => {
  it('returns tabbable controls in document order, skipping disabled and tabindex -1', () => {
    const root = mountTrap(`
      <button type="button">A</button>
      <button type="button" disabled>B</button>
      <a href="#x">C</a>
      <button type="button" tabindex="-1">D</button>
      <input type="hidden" value="no" />
      <input type="text" value="E" />
    `);

    expect(
      listFocusable(root).map((el) => el.textContent || (el as HTMLInputElement).value),
    ).toEqual(['A', 'C', 'E']);
  });

  it('skips hidden and aria-hidden candidates', () => {
    const root = mountTrap(`
      <button type="button" hidden>H</button>
      <button type="button" aria-hidden="true">X</button>
      <button type="button">Ok</button>
    `);

    expect(listFocusable(root).map((el) => el.textContent)).toEqual(['Ok']);
  });
});

describe('getInitialFocusTarget', () => {
  it('prefers the first focusable control', () => {
    const root = mountTrap(`
      <p>Title</p>
      <button type="button">First</button>
      <button type="button">Second</button>
    `);
    expect(getInitialFocusTarget(root).textContent).toBe('First');
  });

  it('falls back to the root when nothing is focusable', () => {
    const root = mountTrap('<p>Empty dialog</p>');
    expect(getInitialFocusTarget(root)).toBe(root);
  });
});

describe('resolveTabWrap', () => {
  it('returns null for an empty list', () => {
    expect(resolveTabWrap([], null, false)).toBeNull();
  });

  it('keeps a single focusable when Tab or Shift+Tab wraps', () => {
    const root = mountTrap('<button type="button">Only</button>');
    const only = listFocusable(root)[0]!;
    expect(resolveTabWrap([only], only, false)).toBe(only);
    expect(resolveTabWrap([only], only, true)).toBe(only);
  });

  it('wraps forward from last and backward from first', () => {
    const root = mountTrap(`
      <button type="button">A</button>
      <button type="button">B</button>
      <button type="button">C</button>
    `);
    const [a, b, c] = listFocusable(root);
    expect(resolveTabWrap([a!, b!, c!], c!, false)).toBe(a);
    expect(resolveTabWrap([a!, b!, c!], a!, true)).toBe(c);
    expect(resolveTabWrap([a!, b!, c!], b!, false)).toBeNull();
    expect(resolveTabWrap([a!, b!, c!], b!, true)).toBeNull();
  });

  it('pulls focus back when active element is outside the list', () => {
    const root = mountTrap(`
      <button type="button">A</button>
      <button type="button">B</button>
    `);
    const [a, b] = listFocusable(root);
    const outsider = document.createElement('button');
    expect(resolveTabWrap([a!, b!], outsider, false)).toBe(a);
    expect(resolveTabWrap([a!, b!], outsider, true)).toBe(b);
    expect(resolveTabWrap([a!, b!], null, false)).toBe(a);
  });
});

describe('handleFocusTrapKeyDown', () => {
  it('calls onEscape and prevents default for Escape when provided', () => {
    const root = mountTrap('<button type="button">A</button>');
    const onEscape = vi.fn();
    const preventDefault = vi.fn();
    handleFocusTrapKeyDown(
      { key: 'Escape', shiftKey: false, preventDefault },
      { root, activeElement: listFocusable(root)[0]!, onEscape },
    );
    expect(onEscape).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('ignores Escape when onEscape is omitted', () => {
    const root = mountTrap('<button type="button">A</button>');
    const preventDefault = vi.fn();
    handleFocusTrapKeyDown(
      { key: 'Escape', shiftKey: false, preventDefault },
      { root, activeElement: listFocusable(root)[0]! },
    );
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('ignores unrelated keys', () => {
    const root = mountTrap('<button type="button">A</button>');
    const preventDefault = vi.fn();
    handleFocusTrapKeyDown(
      { key: 'Enter', shiftKey: false, preventDefault },
      { root, activeElement: listFocusable(root)[0]! },
    );
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('focuses the root when Tabbing with no focusables', () => {
    const root = mountTrap('<p>Empty</p>');
    root.tabIndex = -1;
    const focus = vi.spyOn(root, 'focus');
    const preventDefault = vi.fn();
    handleFocusTrapKeyDown(
      { key: 'Tab', shiftKey: false, preventDefault },
      { root, activeElement: document.body },
    );
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
  });

  it('cycles Tab from the last control back to the first', () => {
    const root = mountTrap(`
      <button type="button">A</button>
      <button type="button">B</button>
    `);
    const [a, b] = listFocusable(root);
    const focusA = vi.spyOn(a!, 'focus');
    const preventDefault = vi.fn();
    handleFocusTrapKeyDown(
      { key: 'Tab', shiftKey: false, preventDefault },
      { root, activeElement: b! },
    );
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(focusA).toHaveBeenCalledOnce();
  });

  it('lets Tab move naturally inside the trap', () => {
    const root = mountTrap(`
      <button type="button">A</button>
      <button type="button">B</button>
    `);
    const [a, b] = listFocusable(root);
    const focusB = vi.spyOn(b!, 'focus');
    const preventDefault = vi.fn();
    handleFocusTrapKeyDown(
      { key: 'Tab', shiftKey: false, preventDefault },
      { root, activeElement: a! },
    );
    expect(preventDefault).not.toHaveBeenCalled();
    expect(focusB).not.toHaveBeenCalled();
  });
});

describe('moveFocusInto / restoreFocus', () => {
  it('moves focus to the first control and ensures the root is programmatically focusable', () => {
    const root = mountTrap('<button type="button">Go</button>');
    const button = listFocusable(root)[0]!;
    const focusBtn = vi.spyOn(button, 'focus');
    const target = moveFocusInto(root);
    expect(root.tabIndex).toBe(-1);
    expect(target).toBe(button);
    expect(focusBtn).toHaveBeenCalledOnce();
  });

  it('does not overwrite an existing tabindex on the root', () => {
    const root = mountTrap('<p>Empty</p>');
    root.tabIndex = 0;
    moveFocusInto(root);
    expect(root.tabIndex).toBe(0);
  });

  it('restores a connected previously focused element', () => {
    const previous = document.createElement('button');
    document.body.appendChild(previous);
    const focus = vi.spyOn(previous, 'focus');
    restoreFocus(previous);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('no-ops when previous focus is missing or disconnected', () => {
    expect(() => restoreFocus(null)).not.toThrow();
    const orphan = document.createElement('button');
    const focus = vi.spyOn(orphan, 'focus');
    restoreFocus(orphan);
    expect(focus).not.toHaveBeenCalled();
  });
});
