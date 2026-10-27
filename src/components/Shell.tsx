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
  backTo,
  trailing,
  headerJoin,
  layout = 'default',
  cabinetHome = false,
  tagline,
}: {
  title?: string;
  children: ReactNode;
  /** Separate back control — the brand mark always navigates home. */
  backTo?: string;
  trailing?: ReactNode;
  /** Compact join-a-room control in the catalogue header. */
  headerJoin?: ReactNode;
  layout?: 'default' | 'catalogue';
  /** Navy home header with tagline (catalogue landing). */
  cabinetHome?: boolean;
  tagline?: string;
}) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE;
  }, [title]);

  return (
    <div
      className={[
        'shell',
        layout === 'catalogue' ? 'shell--catalogue' : '',
        cabinetHome ? 'shell--cabinet-home' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className={cabinetHome ? 'topbar topbar--cabinet-home' : 'topbar'}>
        <div className="topbar-start">
          <Link to="/" className="brand" data-testid="shell-home" aria-label="GamesCabinet home">
            <img
              className="brand-mark"
              src="/brand/gamescabinet-mark.png"
              width={24}
              height={24}
              alt=""
            />
            {title ? null : <span className="brand-wordmark">GamesCabinet</span>}
          </Link>
          {cabinetHome && tagline ? (
            <>
              <span className="topbar-home-divider" aria-hidden="true" />
              <p className="topbar-tagline">{tagline}</p>
            </>
          ) : null}
          {backTo ? (
            <Link to={backTo} className="btn ghost shell-back" data-testid="shell-back">
              Back
            </Link>
          ) : null}
        </div>
        {!cabinetHome && layout === 'catalogue' && headerJoin ? (
          <div className="topbar-center topbar-center--join">{headerJoin}</div>
        ) : !cabinetHome && title ? (
          <h1 className="page-title topbar-center">{title}</h1>
        ) : !cabinetHome ? (
          <div className="topbar-center" aria-hidden="true" />
        ) : null}
        <div className="topbar-right" role="toolbar" aria-label="Shell controls">
          {cabinetHome && headerJoin ? (
            <div className="topbar-right__join">{headerJoin}</div>
          ) : null}
          {trailing ? <div className="topbar-trailing">{trailing}</div> : null}
          <IconLink to="/settings" label="Settings" testId="shell-settings">
            <IconSettings />
          </IconLink>
          {!cabinetHome ? (
            <>
              <MotionCycle />
              <ThemeCycle />
            </>
          ) : null}
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
