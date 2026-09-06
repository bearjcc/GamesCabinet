import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconLink } from './IconControl';
import { IconSettings } from './icons';
import { MotionCycle } from './MotionCycle';
import { ThemeCycle } from './ThemeCycle';

const APP_TITLE = 'GamesCabinet';

export function Shell({
  title,
  children,
  backTo = '/',
  trailing,
}: {
  title?: string;
  children: ReactNode;
  backTo?: string;
  trailing?: ReactNode;
}) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE;
  }, [title]);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to={backTo} className="brand topbar-start" aria-label="GamesCabinet home">
          <img
            className="brand-mark"
            src="/brand/gamescabinet-mark.png"
            width={24}
            height={24}
            alt=""
          />
          {title ? null : <span className="brand-wordmark">GamesCabinet</span>}
        </Link>
        {title ? (
          <h1 className="page-title">{title}</h1>
        ) : (
          <div className="topbar-center" aria-hidden="true" />
        )}
        <div className="topbar-right" role="toolbar" aria-label="Shell controls">
          {trailing ? <div className="topbar-trailing">{trailing}</div> : null}
          <IconLink to="/settings" label="Settings" testId="shell-settings">
            <IconSettings />
          </IconLink>
          <MotionCycle />
          <ThemeCycle />
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
