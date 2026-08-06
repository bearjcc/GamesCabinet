import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { Flip } from '../../components/cinematic';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { CardFace, StockPile } from '../../components/tabletop';
import { primitiveProfile } from '../../lib/cinematic';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { readEffectiveMotion } from '../../lib/motion';
import { kenneyPlayingCardAsset } from '../shared/cards';
import { getWarActions } from './actions';
import type { WarState } from './game';

export function WarBoard({ G, ctx, moves, playerID, isActive }: BoardProps<WarState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  let yourTurnLabel = 'Your turn - fight';
  if (G.lastWasWar) yourTurnLabel = 'Your turn - fight (war!)';

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: yourTurnLabel },
  });

  const [flipPulse, setFlipPulse] = useState(0);
  const [flipActive, setFlipActive] = useState(false);
  const prevRoundRef = useRef(G.rounds);

  useEffect(() => {
    if (G.rounds !== prevRoundRef.current) {
      setFlipPulse((n) => n + 1);
    }
    prevRoundRef.current = G.rounds;
  }, [G.rounds]);

  useEffect(() => {
    if (flipPulse === 0) return;
    setFlipActive(true);
    const ms = primitiveProfile('flip', readEffectiveMotion()).durationMs;
    const t = window.setTimeout(() => setFlipActive(false), ms);
    return () => window.clearTimeout(t);
  }, [flipPulse]);

  const pewActions = getWarActions({ G, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'play') moves.play();
    },
  }));

  const metaBits: string[] = [`P1 ${G.decks[0].length}`, `P2 ${G.decks[1].length}`];
  if (G.lastWinner != null) {
    const seat = Number(G.lastWinner) + 1;
    metaBits.push(G.lastWasWar ? `War won by P${seat}` : `P${seat} took the trick`);
  }

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <div className="play-table__meta" data-testid="war-meta">
            {metaBits.map((bit) => (
              <span key={bit}>{bit}</span>
            ))}
          </div>
        </>
      }
      board={
        <div className="war-table" data-testid="war-board">
          <div className="war-seat">
            <StockPile count={G.decks[0].length} testId="war-pile-0" />
            <span className="war-seat__label">P1</span>
          </div>

          <div className="war-battle" aria-live="polite">
            {(G.warDownCounts[0] > 0 || G.warDownCounts[1] > 0) && (
              <div className="war-battle__down" data-testid="war-down">
                <span>
                  War down: {G.warDownCounts[0]} / {G.warDownCounts[1]}
                </span>
              </div>
            )}
            <Flip key={flipPulse} active={flipActive} className="war-battle__cinematic">
              <div className="war-battle__faces">
                {G.faceUp[0] ? (
                  <CardFace
                    card={G.faceUp[0]}
                    assetSrc={kenneyPlayingCardAsset(G.faceUp[0])}
                    testId="war-face-0"
                  />
                ) : (
                  <div className="tt-card tt-card--empty" data-testid="war-face-0-empty">
                    -
                  </div>
                )}
                {G.faceUp[1] ? (
                  <CardFace
                    card={G.faceUp[1]}
                    assetSrc={kenneyPlayingCardAsset(G.faceUp[1])}
                    testId="war-face-1"
                  />
                ) : (
                  <div className="tt-card tt-card--empty" data-testid="war-face-1-empty">
                    -
                  </div>
                )}
              </div>
            </Flip>
          </div>

          <div className="war-seat">
            <StockPile count={G.decks[1].length} testId="war-pile-1" />
            <span className="war-seat__label">P2</span>
          </div>
        </div>
      }
      actions={<ActionSurface label="War actions" actions={surfaceActions} />}
    />
  );
}
