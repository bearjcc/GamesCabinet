export const THEMES = ['white', 'light', 'dark', 'black'] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_KEY = 'gamescabinet.theme';
export const DEFAULT_THEME: Theme = 'light';

const THEME_COLORS: Record<Theme, string> = {
  white: '#FAFAFA',
  light: '#F4EFE4',
  dark: '#122033',
  black: '#212121',
};

export function isTheme(value: string | null | undefined): value is Theme {
  return !!value && (THEMES as readonly string[]).includes(value);
}

export function getTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return isTheme(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function nextTheme(current: Theme): Theme {
  const i = THEMES.indexOf(current);
  return THEMES[(i + 1) % THEMES.length]!;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode / quota — still apply in-session */
  }
  applyTheme(theme);
}

export function cycleTheme(current: Theme = getTheme()): Theme {
  const next = nextTheme(current);
  setTheme(next);
  return next;
}

export function themeLabel(theme: Theme): string {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}
