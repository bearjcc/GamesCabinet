import type { CSSProperties } from 'react';
import { kenneyDieFaceAsset } from '../games/shared/dice/kenney';
import type { DieFaceValue } from '../games/shared/dice/types';
import { kenneyIcon } from '../games/shared/tokens/kenney';
import { gameAccentStyle } from '../lib/gameIdentity';
import { defaultSeatColours } from '../lib/seatColours';

const CARD_BACK = '/assets/kenney/boardgame-pack/PNG/Cards/cardBack_red1.png';
const CARD_HEARTS = '/assets/kenney/boardgame-pack/PNG/Cards/cardHearts8.png';
const CARD_SPADES = '/assets/kenney/boardgame-pack/PNG/Cards/cardSpadesA.png';

type Props = {
  gameId: string;
  className?: string;
  /** Smaller art for launch table well; lid fills the box-lid tile. */
  variant?: 'tile' | 'launch' | 'lid';
};

export function GameThumbnail({ gameId, className = '', variant = 'tile' }: Props) {
  const style = gameAccentStyle(gameId) as CSSProperties;
  const rootClass = [
    'game-thumb',
    variant === 'launch' ? 'game-thumb--launch' : '',
    variant === 'lid' ? 'game-thumb--lid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} style={style} data-testid={`game-thumb-${gameId}`} aria-hidden>
      <div className="game-thumb__scene">{renderScene(gameId)}</div>
    </div>
  );
}

function renderScene(gameId: string) {
  switch (gameId) {
    case 'tic-tac-toe':
      return <GridMarks rows={3} cols={3} marks={['x', 'o', 'x', '', 'o', '', 'x', '', 'o']} />;
    case 'connect-four': {
      const [red, yellow] = defaultSeatColours(2, 'connect-four');
      const hole = '#0f1620';
      const discs = new Set(['2-3', '3-2', '3-3', '4-1', '5-2']);
      return (
        <svg viewBox="0 0 64 48" className="game-thumb__svg" aria-hidden="true">
          <rect width="64" height="48" rx="4" fill="#2c5f8a" />
          {[0, 1, 2, 3, 4, 5].map((col) =>
            [0, 1, 2, 3].map((row) => {
              const key = `${col}-${row}`;
              const fill = discs.has(key) ? (key === '3-2' || key === '5-2' ? yellow : red) : hole;
              return <circle key={key} cx={8 + col * 9} cy={10 + row * 9} r="3.2" fill={fill} />;
            }),
          )}
        </svg>
      );
    }
    case 'checkers':
      return <CheckerBoard />;
    case 'dominoes':
      return (
        <div className="game-thumb__dominoes">
          <span className="game-thumb__bone">3|5</span>
          <span className="game-thumb__bone">6|6</span>
          <span className="game-thumb__bone">2|4</span>
        </div>
      );
    case '2048':
      return (
        <div className="game-thumb__2048">
          {['2', '4', '8', '16'].map((n) => (
            <span key={n} className="game-thumb__2048-cell">
              {n}
            </span>
          ))}
        </div>
      );
    case 'yatzy':
      return (
        <div className="game-thumb__dice">
          {([1, 3, 5, 2, 6] as DieFaceValue[]).map((face) => (
            <img key={face} src={kenneyDieFaceAsset(face)} alt="" />
          ))}
        </div>
      );
    case 'letter-walker':
      return (
        <div className="game-thumb__letters">
          {['W', 'A', 'L', 'K'].map((ch) => (
            <span key={ch}>{ch}</span>
          ))}
        </div>
      );
    case 'crazy-eights':
    case 'go-fish':
    case 'war':
      return (
        <div className="game-thumb__cards">
          <img src={CARD_BACK} alt="" />
          <img src={CARD_HEARTS} alt="" />
          <img src={CARD_SPADES} alt="" />
        </div>
      );
    case 'reversi':
      return <ReversiStones />;
    case 'memory':
      return (
        <div className="game-thumb__memory">
          {Array.from({ length: 6 }, (_, i) => (
            <img key={i} src={CARD_BACK} alt="" />
          ))}
        </div>
      );
    case 'mancala':
      return <MancalaPits />;
    case 'klondike':
    case 'freecell':
      return (
        <div className="game-thumb__solitaire">
          <img src={CARD_BACK} alt="" className="game-thumb__stock" />
          <img src={CARD_HEARTS} alt="" />
          <img src={CARD_SPADES} alt="" />
        </div>
      );
    case 'go':
      return <GoBoard />;
    case 'chinese-checkers':
      return <ChineseCheckersLid />;
    case 'battleship':
      return <BattleshipLid />;
    case 'chess':
      return <ChessMini />;
    case 'nine-mens-morris':
      return <MorrisBoard />;
    case 'backgammon':
      return <BackgammonBar />;
    case 'dots-and-boxes':
      return <DotsGrid />;
    case 'snakes-and-ladders':
      return (
        <svg viewBox="0 0 64 48" className="game-thumb__svg" aria-hidden="true">
          <rect width="64" height="48" rx="4" fill="#f5e6c8" />
          <path
            d="M6 40 C 20 10, 44 38, 58 8"
            stroke="var(--game-accent)"
            strokeWidth="3"
            fill="none"
          />
          <circle cx="12" cy="36" r="4" fill="var(--brand-red)" />
          <circle cx="50" cy="14" r="4" fill="var(--brand-blue)" />
        </svg>
      );
    case 'nim':
      return (
        <div className="game-thumb__nim">
          {[3, 2, 1].map((count, row) => (
            <div key={row} className="game-thumb__nim-row">
              {Array.from({ length: count }, (_, i) => (
                <span key={i} className="game-thumb__stone" />
              ))}
            </div>
          ))}
        </div>
      );
    case 'orbits':
      return (
        <svg viewBox="0 0 64 48" className="game-thumb__svg" aria-hidden="true">
          <circle cx="32" cy="24" r="14" fill="none" stroke="var(--game-accent)" strokeWidth="2" />
          <circle cx="32" cy="24" r="4" fill="var(--game-accent)" />
          <circle cx="46" cy="24" r="3" fill="var(--brand-yellow)" />
        </svg>
      );
    case 'tracks':
      return <TracksLid />;
    case 'hogwarts-battle':
      return (
        <div className="game-thumb__cards game-thumb__cards--fan">
          <img src={CARD_BACK} alt="" />
          <img src={CARD_HEARTS} alt="" />
        </div>
      );
    default:
      return <span className="game-thumb__fallback" style={{ background: 'var(--game-accent)' }} />;
  }
}

function GridMarks({ rows, cols, marks }: { rows: number; cols: number; marks: string[] }) {
  return (
    <div className="game-thumb__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <span key={i} className="game-thumb__grid-cell">
          {marks[i] === 'x' ? '×' : marks[i] === 'o' ? '○' : ''}
        </span>
      ))}
    </div>
  );
}

function CheckerBoard() {
  return (
    <div className="game-thumb__checker">
      {Array.from({ length: 16 }, (_, i) => {
        const dark = (Math.floor(i / 4) + i) % 2 === 0;
        return (
          <span key={i} className={dark ? 'is-dark' : ''}>
            {i === 5 ? <span className="game-thumb__disc light" /> : null}
            {i === 10 ? <span className="game-thumb__disc dark" /> : null}
          </span>
        );
      })}
    </div>
  );
}

function ReversiStones() {
  const felt = '#1a6b48';
  const line = '#2d8a5c';
  const gridOrigin = { x: 13, y: 8 };
  const step = 5.6;
  const size = 6;
  return (
    <svg viewBox="0 0 64 48" className="game-thumb__svg game-thumb__svg--fill" aria-hidden="true">
      <rect width="64" height="48" fill={felt} />
      {Array.from({ length: size + 1 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={gridOrigin.x + i * step}
          y1={gridOrigin.y}
          x2={gridOrigin.x + i * step}
          y2={gridOrigin.y + size * step}
          stroke={line}
          strokeWidth="0.55"
        />
      ))}
      {Array.from({ length: size + 1 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={gridOrigin.x}
          y1={gridOrigin.y + i * step}
          x2={gridOrigin.x + size * step}
          y2={gridOrigin.y + i * step}
          stroke={line}
          strokeWidth="0.55"
        />
      ))}
      <circle
        cx={gridOrigin.x + 2.5 * step}
        cy={gridOrigin.y + 2.5 * step}
        r="2.65"
        fill="#fbf6ec"
        stroke="#1c1917"
        strokeWidth="0.45"
      />
      <circle
        cx={gridOrigin.x + 3.5 * step}
        cy={gridOrigin.y + 2.5 * step}
        r="2.65"
        fill="#1c1917"
      />
      <circle
        cx={gridOrigin.x + 2.5 * step}
        cy={gridOrigin.y + 3.5 * step}
        r="2.65"
        fill="#1c1917"
      />
      <circle
        cx={gridOrigin.x + 3.5 * step}
        cy={gridOrigin.y + 3.5 * step}
        r="2.65"
        fill="#fbf6ec"
        stroke="#1c1917"
        strokeWidth="0.45"
      />
    </svg>
  );
}

function MancalaPits() {
  return (
    <svg viewBox="0 0 64 48" className="game-thumb__svg" aria-hidden="true">
      <rect width="64" height="32" y="8" rx="6" fill="#5c3a22" />
      {[8, 20, 32, 44, 56].map((cx, i) => (
        <ellipse key={i} cx={cx} cy="24" rx="5" ry="4" fill="#2f6b4a" />
      ))}
      <ellipse cx="4" cy="24" rx="3" ry="8" fill="#174f2b" />
      <ellipse cx="60" cy="24" rx="3" ry="8" fill="#174f2b" />
    </svg>
  );
}

function GoBoard() {
  return (
    <svg viewBox="0 0 64 48" className="game-thumb__svg" aria-hidden="true">
      <rect width="64" height="48" fill="#e8c874" />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`h${i}`} x1="8" y1={10 + i * 7} x2="56" y2={10 + i * 7} stroke="#5c3a22" />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <line key={`v${i}`} x1={8 + i * 8} y1="10" x2={8 + i * 8} y2="38" stroke="#5c3a22" />
      ))}
      <circle cx="32" cy="24" r="3.5" fill="#1c1917" />
      <circle cx="24" cy="17" r="3.5" fill="#fbf6ec" stroke="#1c1917" />
    </svg>
  );
}

function ChessMini() {
  return (
    <div className="game-thumb__chess">
      <div className="game-thumb__chess-board">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className={(Math.floor(i / 4) + i) % 2 === 0 ? 'is-dark' : ''} />
        ))}
      </div>
      <img src={kenneyIcon('chess_king')} alt="" className="game-thumb__chess-piece" />
      <img src={kenneyIcon('chess_pawn')} alt="" className="game-thumb__chess-piece pawn" />
    </div>
  );
}

function MorrisBoard() {
  return (
    <svg viewBox="0 0 64 48" className="game-thumb__svg" aria-hidden="true">
      <rect width="64" height="48" fill="#ebe3d2" />
      <rect x="14" y="8" width="36" height="32" fill="none" stroke="#5c3a22" strokeWidth="1.5" />
      <rect x="20" y="14" width="24" height="20" fill="none" stroke="#5c3a22" strokeWidth="1.5" />
      <line x1="32" y1="8" x2="32" y2="40" stroke="#5c3a22" strokeWidth="1.5" />
      <line x1="14" y1="24" x2="50" y2="24" stroke="#5c3a22" strokeWidth="1.5" />
      <circle cx="32" cy="24" r="3" fill="var(--game-accent)" />
    </svg>
  );
}

function BackgammonBar() {
  return (
    <svg viewBox="0 0 64 48" className="game-thumb__svg" aria-hidden="true">
      <rect width="64" height="48" rx="4" fill="#5c3a22" />
      <rect x="31" y="4" width="2" height="40" fill="#2a241c" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={10 + i * 4} cy={14} r="2.5" fill="#fbf6ec" />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={48 + i * 4} cy={34} r="2.5" fill="#1c1917" />
      ))}
    </svg>
  );
}

function ChineseCheckersLid() {
  const holes = [
    [32, 8],
    [24, 14],
    [40, 14],
    [16, 20],
    [32, 20],
    [48, 20],
    [8, 26],
    [24, 26],
    [40, 26],
    [56, 26],
    [16, 32],
    [32, 32],
    [48, 32],
    [24, 38],
    [40, 38],
    [32, 44],
  ];
  return (
    <svg viewBox="0 0 64 48" className="game-thumb__svg game-thumb__svg--fill" aria-hidden="true">
      <rect width="64" height="48" fill="#c45c4a" />
      {holes.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="3.2"
          fill={i % 5 === 0 ? '#fbf6ec' : '#2a241c'}
          stroke="#1c1917"
          strokeWidth="0.5"
        />
      ))}
    </svg>
  );
}

function BattleshipLid() {
  return (
    <svg viewBox="0 0 64 48" className="game-thumb__svg game-thumb__svg--fill" aria-hidden="true">
      <rect width="64" height="48" fill="#1f3d5c" />
      {Array.from({ length: 30 }, (_, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const x = 7 + col * 8.5;
        const y = 6 + row * 7.5;
        const hit = i === 4 || i === 10 || i === 17;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="7"
            height="7"
            fill={hit ? '#8bb4d9' : '#2f4f6d'}
            rx="0.5"
          />
        );
      })}
      <rect x="22" y="20" width="20" height="5" rx="1" fill="#5c7a94" />
    </svg>
  );
}

function TracksLid() {
  return (
    <img
      className="game-thumb__tracks-photo"
      src="/assets/lids/tracks-lid.webp"
      alt=""
      decoding="async"
    />
  );
}

function DotsGrid() {
  return (
    <svg viewBox="0 0 64 48" className="game-thumb__svg" aria-hidden="true">
      <rect width="64" height="48" fill="#fbf6ec" />
      {Array.from({ length: 20 }, (_, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        return <circle key={i} cx={10 + col * 11} cy={10 + row * 9} r="2" fill="#2a241c" />;
      })}
      <line x1="10" y1="10" x2="21" y2="10" stroke="var(--game-accent)" strokeWidth="2" />
      <line x1="10" y1="10" x2="10" y2="19" stroke="var(--game-accent)" strokeWidth="2" />
    </svg>
  );
}
