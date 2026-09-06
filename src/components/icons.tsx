import type { ReactNode } from 'react';
import type { MotionIntensity } from '../lib/motion';
import type { Theme } from '../lib/theme';

type IconProps = {
  className?: string;
};

function Svg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1.15rem"
      height="1.15rem"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Zm8.14 4.88-.98-.57a6.2 6.2 0 0 0 0-2.62l.98-.57a1 1 0 0 0 .45-1.34l-.94-1.62a1 1 0 0 0-1.31-.37l-1.15.48a6.3 6.3 0 0 0-2.27-1.31l-.17-1.24a1 1 0 0 0-.99-.86h-1.88a1 1 0 0 0-.99.86l-.17 1.24a6.3 6.3 0 0 0-2.27 1.31l-1.15-.48a1 1 0 0 0-1.31.37l-.94 1.62a1 1 0 0 0 .45 1.34l.98.57a6.2 6.2 0 0 0 0 2.62l-.98.57a1 1 0 0 0-.45 1.34l.94 1.62a1 1 0 0 0 1.31.37l1.15-.48a6.3 6.3 0 0 0 2.27 1.31l.17 1.24a1 1 0 0 0 .99.86h1.88a1 1 0 0 0 .99-.86l.17-1.24a6.3 6.3 0 0 0 2.27-1.31l1.15.48a1 1 0 0 0 1.31-.37l.94-1.62a1 1 0 0 0-.45-1.34Z"
      />
    </Svg>
  );
}

export function IconTheme({ theme, className }: IconProps & { theme: Theme }) {
  if (theme === 'dark' || theme === 'black') {
    return (
      <Svg className={className}>
        <path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7.2 7.2 0 0 1-9-9Z" />
      </Svg>
    );
  }
  if (theme === 'white') {
    return (
      <Svg className={className}>
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </Svg>
    );
  }
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="4.25" fill="currentColor" />
      <path
        fill="currentColor"
        d="M12 2.25v2.1M12 19.65v2.1M4.35 12H2.25M21.75 12h-2.1M5.4 5.4l1.48 1.48M17.12 17.12l1.48 1.48M5.4 18.6l1.48-1.48M17.12 6.88l1.48-1.48"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconMotion({ intensity, className }: IconProps & { intensity: MotionIntensity }) {
  if (intensity === 'reduced') {
    return (
      <Svg className={className}>
        <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
      </Svg>
    );
  }
  if (intensity === 'playful') {
    return (
      <Svg className={className}>
        <path fill="currentColor" d="M8.5 6.5 17 12l-8.5 5.5V6.5Z" />
        <circle cx="18.5" cy="6.5" r="1.35" fill="currentColor" />
        <circle cx="19.5" cy="17.5" r="1.1" fill="currentColor" />
      </Svg>
    );
  }
  return (
    <Svg className={className}>
      <path fill="currentColor" d="M9 7.5 16.5 12 9 16.5V7.5Z" />
    </Svg>
  );
}

export function IconNewGame({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        d="M12 4.5a7.5 7.5 0 1 0 7.5 7.5h-1.75A5.75 5.75 0 1 1 12 6.25V4.5Zm0-2.25 2.75 2.75H12V2.25Z"
      />
    </Svg>
  );
}

export function IconUndo({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        d="M9.25 8.25H15a4.25 4.25 0 1 1 0 8.5h-.9v-1.75H15a2.5 2.5 0 1 0 0-5h-4.1l1.65 1.65-1.24 1.24-4.1-4.1 4.1-4.1 1.24 1.24-1.65 1.65Z"
      />
    </Svg>
  );
}

export function IconRedo({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        d="M14.75 8.25H9a4.25 4.25 0 1 0 0 8.5h.9v-1.75H9a2.5 2.5 0 1 1 0-5h4.1l-1.65 1.65 1.24 1.24 4.1-4.1-4.1-4.1-1.24 1.24 1.65 1.65Z"
      />
    </Svg>
  );
}

export function IconScores({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        d="M7.5 4.5h9l1.5 4.5H6L7.5 4.5Zm-.75 7.5h10.5l-1.2 6H8.7l-1.95-6Zm2.55 1.5-.6 3h4.5l-.6-3h-3.3Z"
      />
    </Svg>
  );
}

export function IconHelp({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        d="M12 4.5a5.25 5.25 0 0 1 3.72 8.97c-1.05.9-1.72 1.65-1.72 3.03h-1.9c0-1.95 1.05-2.95 2.2-3.9A3.35 3.35 0 1 0 8.65 12H6.75a5.25 5.25 0 1 1 6.25-7.5Zm-1.1 11.25h2.2v2.25h-2.2v-2.25Z"
      />
    </Svg>
  );
}

export function IconKeepGoing({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path fill="currentColor" d="M9.5 7.5 17 12l-7.5 4.5V7.5Z" />
    </Svg>
  );
}

export function IconTryAgain({ className }: IconProps) {
  return <IconNewGame className={className} />;
}
