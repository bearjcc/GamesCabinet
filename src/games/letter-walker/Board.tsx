import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { FocusTrap } from '../../components/FocusTrap';
import { LeaderboardPanel } from '../../components/LeaderboardPanel';
import { PlayTable } from '../../components/PlayTable';
import { ScoreSubmitter } from '../../components/ScoreSubmitter';
import { SoloPlayTabs } from '../../components/SoloPlayTabs';
import { StatusBar } from '../../components/StatusBar';
import type { StatusTone } from '../../lib/matchStatus';
import type { SubmitScoreInput } from '../../lib/scores';
import { getNickname } from '../../lib/storage';
import { getLetterWalkerActions } from './actions';
import { dictionarySize, parseDictionaryText, setLetterWalkerDictionary } from './dictionary';
import type { LetterWalkerState, ShiftDir } from './game';
import { GRID_SIZE } from './game';
import { type CellPos, extendSelection, wordFromGrid } from './selection';

type PointerMode = 'auto' | 'slide' | 'select';

type SlideGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  row: number;
  col: number;
  axis: 'row' | 'col' | null;
  consumed: number;
};

const SLIDE_THRESHOLD_PX = 16;

function cellSizePx(board: HTMLElement | null): number {
  if (!board) return 44;
  const cell = board.querySelector<HTMLElement>('.lw-cell');
  if (!cell) return 44;
  return cell.getBoundingClientRect().width || 44;
}

export function LetterWalkerBoard({ G, moves, isActive }: BoardProps<LetterWalkerState>) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<PointerMode>('auto');
  const [selected, setSelected] = useState<CellPos[]>([]);
  const [dictReady, setDictReady] = useState(dictionarySize() > 0);
  const [dictError, setDictError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [boardTab, setBoardTab] = useState<'play' | 'scores'>('play');
  const slideRef = useRef<SlideGesture | null>(null);
  const selectPointerRef = useRef<number | null>(null);

  const playable = Boolean(isActive && !G.completed);
  const selectedWord = wordFromGrid(G.grid, selected);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/letter-walker/dictionary.txt');
        if (!res.ok) throw new Error('dictionary fetch failed');
        const text = await res.text();
        if (cancelled) return;
        setLetterWalkerDictionary(parseDictionaryText(text));
        setDictReady(true);
      } catch {
        if (!cancelled) setDictError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingSubmit = useMemo((): SubmitScoreInput | null => {
    if (!G.completed || G.foundWords.length === 0) return null;
    return {
      playerName: getNickname().trim() || 'Anonymous',
      score: G.score,
      moves: G.moves,
      wordsFound: G.foundWords.length,
      puzzleNumber: G.puzzleNumber,
    };
  }, [G.completed, G.foundWords.length, G.moves, G.puzzleNumber, G.score]);

  function clearSelection() {
    setSelected([]);
    selectPointerRef.current = null;
  }

  function onShift(rowOrCol: number, dir: ShiftDir) {
    if (!playable) return;
    if (dir === 'left' || dir === 'right') moves.shiftRow(rowOrCol, dir);
    else moves.shiftCol(rowOrCol, dir);
    clearSelection();
  }

  function onTapCell(row: number, col: number) {
    if (!playable || mode === 'slide') return;
    setSelected((prev) => extendSelection(prev, row, col));
  }

  function onSelectMove(clientX: number, clientY: number) {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest?.('.lw-cell') as HTMLElement | null;
    if (!cell?.dataset.row || cell.dataset.col == null) return;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    setSelected((prev) => extendSelection(prev, row, col));
  }

  function beginSlide(e: React.PointerEvent, row: number, col: number) {
    slideRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      row,
      col,
      axis: null,
      consumed: 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function updateSlide(e: React.PointerEvent) {
    const g = slideRef.current;
    if (!g || g.pointerId !== e.pointerId || !playable) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.axis) {
      if (Math.abs(dx) < SLIDE_THRESHOLD_PX && Math.abs(dy) < SLIDE_THRESHOLD_PX) return;
      g.axis = Math.abs(dx) >= Math.abs(dy) ? 'row' : 'col';
      g.consumed = 0;
      clearSelection();
    }
    const step = cellSizePx(boardRef.current);
    if (g.axis === 'row') {
      const steps = Math.trunc(dx / step);
      while (g.consumed < steps) {
        onShift(g.row, 'right');
        g.consumed++;
      }
      while (g.consumed > steps) {
        onShift(g.row, 'left');
        g.consumed--;
      }
    } else {
      const steps = Math.trunc(dy / step);
      while (g.consumed < steps) {
        onShift(g.col, 'down');
        g.consumed++;
      }
      while (g.consumed > steps) {
        onShift(g.col, 'up');
        g.consumed--;
      }
    }
  }

  function endPointer(e: React.PointerEvent, row: number, col: number) {
    const slide = slideRef.current;
    const wasSlide = Boolean(slide?.axis);
    if (slide && slide.pointerId === e.pointerId) slideRef.current = null;

    if (mode === 'select') {
      selectPointerRef.current = null;
      return;
    }

    if (mode === 'auto' && !wasSlide && playable) {
      onTapCell(row, col);
    }
  }

  function handleSubmit() {
    if (!playable) return;
    if (!dictReady) {
      setMessage('Loading dictionary…');
      return;
    }
    if (selectedWord.length < 3) return;
    moves.submitWord(selected);
    clearSelection();
  }

  async function handleShare() {
    const word = G.foundWords[0] ?? selectedWord.toUpperCase();
    const text = `Letter Walker — ${word || 'puzzle'} — score ${G.score} in ${G.moves} moves`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copied result to clipboard');
    } catch {
      setMessage(text);
    }
  }

  // Solo puzzle chrome — not the multiplayer turn/win shape of deriveMatchStatus.
  let status = `Score ${G.score} · Moves ${G.moves} · Puzzle ${G.puzzleNumber}`;
  let tone: StatusTone = 'you';
  if (G.completed) {
    tone = 'done';
    status = `Found ${G.foundWords[0] ?? 'word'} — score ${G.score}`;
  } else if (!dictReady && !dictError) {
    tone = 'wait';
    status = 'Loading dictionary…';
  } else if (dictError) {
    tone = 'wait';
    status = 'Dictionary failed to load';
  }

  const pewActions = getLetterWalkerActions({
    playable,
    boardTab,
    selectedCount: selected.length,
    wordLength: selectedWord.length,
    dictReady,
  });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'clear') {
        clearSelection();
        return;
      }
      if (action.id === 'submit') {
        handleSubmit();
        return;
      }
      if (action.id === 'new-puzzle') {
        moves.newPuzzle();
        clearSelection();
      }
    },
  }));

  return (
    <>
      <ScoreSubmitter
        gameId="letter-walker"
        pendingSubmit={pendingSubmit}
        onSubmitted={() => setMessage(null)}
      />
      <PlayTable
        info={
          <>
            <StatusBar text={status} tone={tone} />
            <div className="lw-toolbar" role="group" aria-label="Letter Walker controls">
              <div className="lw-modes" role="radiogroup" aria-label="Pointer mode">
                {(['auto', 'slide', 'select'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn lw-mode${mode === m ? ' is-active' : ''}`}
                    aria-pressed={mode === m}
                    data-testid={`lw-mode-${m}`}
                    onClick={() => setMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <SoloPlayTabs value={boardTab} onChange={setBoardTab} testIdPrefix="lw" />
            </div>
            {message ? (
              <p className="lw-message" role="status" data-testid="lw-message">
                {message}
              </p>
            ) : null}
          </>
        }
        board={
          boardTab === 'scores' ? (
            <LeaderboardPanel gameId="letter-walker" testIdPrefix="lw" />
          ) : (
            <div className="lw-play">
              <div className="lw-selected" data-testid="lw-selected-word">
                {selectedWord || '—'}
              </div>

              <div className="lw-board-wrap">
                <div className="lw-col-arrows lw-col-arrows--top">
                  {Array.from({ length: GRID_SIZE }, (_, c) => (
                    <button
                      key={`up-${c}`}
                      type="button"
                      className="btn lw-arrow"
                      disabled={!playable}
                      data-testid={`lw-col-up-${c}`}
                      aria-label={`Slide column ${c + 1} up`}
                      onClick={() => onShift(c, 'up')}
                    >
                      U
                    </button>
                  ))}
                </div>

                <div className="lw-mid">
                  <div className="lw-row-arrows">
                    {Array.from({ length: GRID_SIZE }, (_, r) => (
                      <button
                        key={`left-${r}`}
                        type="button"
                        className="btn lw-arrow"
                        disabled={!playable}
                        data-testid={`lw-row-left-${r}`}
                        aria-label={`Slide row ${r + 1} left`}
                        onClick={() => onShift(r, 'left')}
                      >
                        L
                      </button>
                    ))}
                  </div>

                  <div
                    ref={boardRef}
                    className="lw-board"
                    role="grid"
                    aria-label="Letter Walker board"
                    data-testid="lw-board"
                  >
                    {G.grid.map((row, r) =>
                      row.map((letter, c) => {
                        const isSel = selected.some((s) => s.row === r && s.col === c);
                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`lw-cell${isSel ? ' is-selected' : ''}`}
                            role="gridcell"
                            data-row={r}
                            data-col={c}
                            data-testid={`lw-cell-${r}-${c}`}
                            onPointerDown={(e) => {
                              if (!playable) return;
                              if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
                              if (mode === 'select') {
                                selectPointerRef.current = e.pointerId;
                                setSelected([{ row: r, col: c }]);
                                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                                return;
                              }
                              beginSlide(e, r, c);
                            }}
                            onPointerMove={(e) => {
                              if (mode === 'select') {
                                if (selectPointerRef.current !== e.pointerId) return;
                                if (e.cancelable) e.preventDefault();
                                onSelectMove(e.clientX, e.clientY);
                                return;
                              }
                              updateSlide(e);
                            }}
                            onPointerUp={(e) => endPointer(e, r, c)}
                            onPointerCancel={(e) => endPointer(e, r, c)}
                          >
                            {letter}
                          </div>
                        );
                      }),
                    )}
                  </div>

                  <div className="lw-row-arrows">
                    {Array.from({ length: GRID_SIZE }, (_, r) => (
                      <button
                        key={`right-${r}`}
                        type="button"
                        className="btn lw-arrow"
                        disabled={!playable}
                        data-testid={`lw-row-right-${r}`}
                        aria-label={`Slide row ${r + 1} right`}
                        onClick={() => onShift(r, 'right')}
                      >
                        R
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lw-col-arrows lw-col-arrows--bottom">
                  {Array.from({ length: GRID_SIZE }, (_, c) => (
                    <button
                      key={`down-${c}`}
                      type="button"
                      className="btn lw-arrow"
                      disabled={!playable}
                      data-testid={`lw-col-down-${c}`}
                      aria-label={`Slide column ${c + 1} down`}
                      onClick={() => onShift(c, 'down')}
                    >
                      D
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        }
        pew={
          boardTab === 'play' ? (
            <div className="lw-actions">
              <button type="button" className="btn" data-testid="lw-share" onClick={handleShare}>
                Share
              </button>
              <button
                type="button"
                className="btn"
                data-testid="lw-help"
                onClick={() => setHelpOpen(true)}
              >
                Help
              </button>
            </div>
          ) : null
        }
        actions={<ActionSurface label="Letter Walker actions" actions={surfaceActions} />}
      />

      {helpOpen ? (
        <FocusTrap
          className="lw-help"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lw-help-title"
          data-testid="lw-help-dialog"
          onEscape={() => setHelpOpen(false)}
        >
          <h2 id="lw-help-title">Letter Walker</h2>
          <p>Slide rows and columns to line up a word, then submit it.</p>
          <ul>
            <li>
              <strong>Auto</strong> (default): drag slides a row or column; tap cells to build a
              word.
            </li>
            <li>
              <strong>Slide</strong>: drag only; taps do not select.
            </li>
            <li>
              <strong>Select</strong>: drag to select a straight word (classic).
            </li>
          </ul>
          <p>
            Score: 10 per letter, minus moves; 8-letter words score double. Concept by Luke Walker.
          </p>
          <button
            type="button"
            className="btn"
            data-testid="lw-help-close"
            onClick={() => setHelpOpen(false)}
          >
            Close
          </button>
        </FocusTrap>
      ) : null}
    </>
  );
}
