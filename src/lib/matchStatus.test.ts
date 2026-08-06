import { describe, expect, it } from 'vitest';
import { deriveMatchStatus } from './matchStatus';

describe('deriveMatchStatus', () => {
  it('reports waiting when explicitly waiting for players', () => {
    expect(deriveMatchStatus({ currentPlayer: '0' }, undefined, { waiting: true })).toEqual({
      text: 'Waiting…',
      tone: 'wait',
    });
  });

  it('reports your turn when seat matches current player', () => {
    expect(deriveMatchStatus({ currentPlayer: '0' }, '0')).toEqual({
      text: 'Your turn',
      tone: 'you',
    });
  });

  it('reports their turn when seat does not match', () => {
    expect(deriveMatchStatus({ currentPlayer: '1' }, '0')).toEqual({
      text: 'Their turn',
      tone: 'wait',
    });
  });

  it('uses custom turn labels', () => {
    expect(
      deriveMatchStatus({ currentPlayer: '0' }, '0', {
        labels: { yourTurn: 'Your turn — tap a square' },
      }),
    ).toEqual({ text: 'Your turn — tap a square', tone: 'you' });
  });

  it('honours isYourTurn override over seat comparison', () => {
    expect(deriveMatchStatus({ currentPlayer: '1' }, '0', { isYourTurn: true })).toEqual({
      text: 'Your turn',
      tone: 'you',
    });
    expect(deriveMatchStatus({ currentPlayer: '0' }, '0', { isYourTurn: false })).toEqual({
      text: 'Their turn',
      tone: 'wait',
    });
  });

  it('treats null or undefined playerID as not your seat (their turn)', () => {
    expect(deriveMatchStatus({ currentPlayer: '0' }, null)).toEqual({
      text: 'Their turn',
      tone: 'wait',
    });
    expect(deriveMatchStatus({ currentPlayer: '0' }, undefined)).toEqual({
      text: 'Their turn',
      tone: 'wait',
    });
  });

  it('reports draw on gameover.draw', () => {
    expect(deriveMatchStatus({ currentPlayer: '0', gameover: { draw: true } }, '0')).toEqual({
      text: 'Draw',
      tone: 'done',
    });
  });

  it('reports you win when winner matches seat', () => {
    expect(deriveMatchStatus({ currentPlayer: '0', gameover: { winner: '0' } }, '0')).toEqual({
      text: 'You win',
      tone: 'done',
    });
  });

  it('reports opponent wins when winner is the other seat', () => {
    expect(deriveMatchStatus({ currentPlayer: '0', gameover: { winner: '1' } }, '0')).toEqual({
      text: 'Opponent wins',
      tone: 'done',
    });
  });

  it('reports opponent wins for spectator-ish seats with no playerID', () => {
    expect(deriveMatchStatus({ currentPlayer: '0', gameover: { winner: '0' } }, null)).toEqual({
      text: 'Opponent wins',
      tone: 'done',
    });
    expect(deriveMatchStatus({ currentPlayer: '0', gameover: { winner: '1' } }, undefined)).toEqual(
      { text: 'Opponent wins', tone: 'done' },
    );
  });

  it('uses custom endgame labels', () => {
    expect(
      deriveMatchStatus({ currentPlayer: '0', gameover: { winner: '0' } }, '0', {
        labels: { youWin: 'You win — board clear' },
      }),
    ).toEqual({ text: 'You win — board clear', tone: 'done' });
    expect(
      deriveMatchStatus({ currentPlayer: '0', gameover: { draw: true } }, '0', {
        labels: { draw: 'Stalemate' },
      }),
    ).toEqual({ text: 'Stalemate', tone: 'done' });
  });

  it('prefers gameover over turn state', () => {
    expect(
      deriveMatchStatus({ currentPlayer: '0', gameover: { winner: '1' } }, '0', {
        isYourTurn: true,
      }),
    ).toEqual({ text: 'Opponent wins', tone: 'done' });
  });

  it('prefers waiting over turn state when both set', () => {
    expect(
      deriveMatchStatus({ currentPlayer: '0' }, '0', {
        waiting: true,
        isYourTurn: true,
      }),
    ).toEqual({ text: 'Waiting…', tone: 'wait' });
  });

  it('treats draw key as draw even when value is truthy non-boolean', () => {
    expect(deriveMatchStatus({ currentPlayer: '0', gameover: { draw: 1 } }, '0')).toEqual({
      text: 'Draw',
      tone: 'done',
    });
  });

  it('falls back to opponent wins when gameover has no winner or draw', () => {
    expect(deriveMatchStatus({ currentPlayer: '0', gameover: {} }, '0')).toEqual({
      text: 'Opponent wins',
      tone: 'done',
    });
  });

  it('treats non-object gameover as a finished match without a winner', () => {
    expect(deriveMatchStatus({ currentPlayer: '0', gameover: true }, '0')).toEqual({
      text: 'Opponent wins',
      tone: 'done',
    });
  });
});
