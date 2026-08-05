import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
        <div className="topbar-left">
          <Link to={backTo} className="brand">
            <img
              className="brand-mark"
              src="/brand/gamescabinet-mark.png"
              width={24}
              height={24}
              alt=""
            />
            GamesCabinet
          </Link>
          {title ? <h1 className="page-title">{title}</h1> : null}
        </div>
        <div className="topbar-right">
          {trailing ? <div className="topbar-trailing">{trailing}</div> : null}
          <ThemeCycle />
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
