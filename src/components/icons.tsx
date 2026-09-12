import type { ReactNode } from 'react';
import type { MotionIntensity } from '../lib/motion';
import type { Theme } from '../lib/theme';

type IconProps = {
  className?: string;
};

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width="1.15rem"
      height="1.15rem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Svg>
  );
}

export function IconTheme({ theme, className }: IconProps & { theme: Theme }) {
  if (theme === 'light') {
    return (
      <Svg className={className}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </Svg>
    );
  }
  if (theme === 'dark') {
    return (
      <Svg className={className}>
        <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 0 0 11.5 11.5z" />
      </Svg>
    );
  }
  if (theme === 'black') {
    return (
      <Svg className={className}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      </Svg>
    );
  }
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
    </Svg>
  );
}

export function IconMotion({ intensity, className }: IconProps & { intensity: MotionIntensity }) {
  if (intensity === 'reduced') {
    return (
      <Svg className={className}>
        <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
        <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      </Svg>
    );
  }
  if (intensity === 'playful') {
    return (
      <Svg className={className}>
        <path d="M4 12c2-4 4-6 8-6s6 2 8 6-4 6-8 6-6-2-8-6z" />
        <path d="M9 12l2 2 4-4" />
      </Svg>
    );
  }
  return (
    <Svg className={className}>
      <polygon points="8,5 19,12 8,19" fill="currentColor" stroke="none" />
    </Svg>
  );
}
