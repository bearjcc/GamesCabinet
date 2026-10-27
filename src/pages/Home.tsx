import { useCallback, useEffect, useMemo, useState } from 'react';
import { CatalogueFocusStrip } from '../components/CatalogueFocusStrip';
import { CatalogueShelfRow } from '../components/CatalogueShelfRow';
import { HeaderJoin } from '../components/HeaderJoin';
import { Shell } from '../components/Shell';
import { browseFocus } from '../lib/catalogueFocusNav';
import { catalogueShelves, defaultFocusGameId, flatShelfGames } from '../lib/catalogueShelves';
import { getGameMeta, visibleGames } from '../lib/games';
import { getUnlockedGames } from '../lib/storage';

export function Home() {
  const shelves = useMemo(() => catalogueShelves(visibleGames(getUnlockedGames())), []);
  const flat = useMemo(() => flatShelfGames(shelves), [shelves]);
  const [focusId, setFocusId] = useState(() => defaultFocusGameId(shelves));
  const focusMeta = getGameMeta(focusId) ?? flat[0];

  const onBrowse = useCallback(
    (direction: 'prev' | 'next' | 'up' | 'down') => {
      setFocusId((current) => browseFocus(shelves, current, direction));
    },
    [shelves],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onBrowse('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onBrowse('next');
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        onBrowse('up');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        onBrowse('down');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBrowse]);

  if (!focusMeta) {
    return null;
  }

  return (
    <Shell
      cabinetHome
      headerJoin={<HeaderJoin />}
      layout="catalogue"
      tagline="Board, card and drawing games. Play alone, pass the screen, or send a friend a code."
    >
      <div className="cabinet-home" data-testid="cabinet-home">
        <CatalogueFocusStrip meta={focusMeta} onBrowse={onBrowse} />
        <p className="cabinet-home__pick">Pick a game.</p>
        <p className="cabinet-home__hint">Play alone, pass the screen, or send a friend a code.</p>
        {shelves.map((shelf) => (
          <CatalogueShelfRow
            focusId={focusId}
            key={shelf.id}
            onFocusGame={setFocusId}
            shelf={shelf}
          />
        ))}
      </div>
      <span id="join" className="sr-only" />
    </Shell>
  );
}
