// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  cycleTheme,
  DEFAULT_THEME,
  getTheme,
  isTheme,
  nextTheme,
  setTheme,
  THEME_KEY,
  themeLabel,
} from './theme';

const store = new Map<string, string>();

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

function stubThemeDom() {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  });
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  document.head.appendChild(meta);
}

describe('theme helpers', () => {
  it('validates theme names', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('neon')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it('reads, applies, and cycles themes', () => {
    stubThemeDom();
    expect(getTheme()).toBe(DEFAULT_THEME);
    store.set(THEME_KEY, 'dark');
    expect(getTheme()).toBe('dark');
    expect(nextTheme('dark')).toBe('black');
    applyTheme('white');
    expect(document.documentElement.dataset.theme).toBe('white');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#FAFAFA',
    );
    expect(setTheme('light')).toBeUndefined();
    expect(cycleTheme('light')).toBe('dark');
    expect(themeLabel('black')).toBe('Black');
  });

  it('falls back when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(getTheme()).toBe(DEFAULT_THEME);
    applyTheme('dark');
    expect(setTheme('dark')).toBeUndefined();
  });

  it('applies theme without a meta tag', () => {
    document.querySelector('meta[name="theme-color"]')?.remove();
    expect(() => applyTheme('dark')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
