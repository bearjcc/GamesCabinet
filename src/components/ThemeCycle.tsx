import { useState } from 'react';
import { cycleTheme, getTheme, type Theme, themeLabel } from '../lib/theme';
import { IconButton } from './IconControl';
import { IconTheme } from './icons';

export function ThemeCycle() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  return (
    <IconButton
      label={`Theme ${themeLabel(theme)}. Click to cycle.`}
      title="Cycle theme"
      testId="theme-cycle"
      onClick={() => setThemeState(cycleTheme(theme))}
    >
      <IconTheme theme={theme} />
    </IconButton>
  );
}
