import { useState } from 'react';
import { cycleTheme, getTheme, type Theme, themeLabel } from '../lib/theme';

export function ThemeCycle() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  return (
    <button
      type="button"
      className="btn ghost theme-cycle"
      onClick={() => setThemeState(cycleTheme(theme))}
      aria-label={`Theme ${themeLabel(theme)}. Click to cycle.`}
      title="Cycle theme"
    >
      {themeLabel(theme)}
    </button>
  );
}
