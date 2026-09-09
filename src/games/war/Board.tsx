import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useRef, useState } from 'react';
import { Flip } from '../../components/cinematic';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { CardFace, StockPile } from '../../components/tabletop';
import { controlA11y } from '../../lib/actions';
import { primitiveProfile } from '../../lib/cinematic';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { readEffectiveMotion } from '../../lib/motion';
import { kenneyPlayingCardAsset } from '../shared/cards';
import type { WarState } from './game';
import { canPlay } from './game';

export function WarBoard({ G, ctx, moves, playerID, isActive }: BoardProps<WarState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  let yourTurnLabel = 'Your turn - tap a deck to fight';
  if (G.lastWasWar) yourTurnLabel = 'Your turn - tap a deck to fight (war!)';

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

  const fightOk = yourTurn && canPlay(G);
  const fightA11y = controlA11y({
    label: 'Fight',
    disabled: !fightOk,
    disabledReason: yourTurn ? 'No cards left to fight' : 'Wait for your turn',
  });

  const fight = () => {
    if (fightOk) moves.play();
  };

  const metaBits: string[] = [];
  if (G.lastWinner != null) {
    const seat = Number(G.lastWinner) + 1;
    metaBits.push(G.lastWasWar ? `War won by P${seat}` : `P${seat} took the trick`);
  }

  const seat = (pileIndex: number, label: string) => (
    <div className="war-seat">
      <StockPile
        count={G.decks[pileIndex].length}
        onDraw={fightOk ? fight : undefined}
        disabled={!fightOk}
        testId={`war-pile-${pileIndex}`}
      />
      <span className="war-seat__label">{label}</span>
    </div>
  );

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <MatchScoreboard
            scores={[
              { label: 'P1', value: G.decks[0].length },
              { label: 'P2', value: G.decks[1].length },
              ...metaBits.map((bit) => ({ label: 'Last', value: bit })),
            ]}
            testId="war-meta"
          />
        </>
      }
      board={
        <div className="war-table" data-testid="war-board">
          {seat(0, 'P1')}

          <button
            type="button"
            className={`war-battle war-fight${fightOk ? ' is-open' : ''}`}
            disabled={!fightOk}
            data-testid="war-fight"
            title={fightA11y.title}
            aria-label={fightA11y.ariaLabel}
            onClick={fight}
          >
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
          </button>

          {seat(1, 'P2')}
        </div>
      }
    />
  );
}
