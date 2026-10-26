import { useState } from 'react';
import { shellSheetActions } from './gameShellRailActions';
import type { GameShellRailActionModel } from './types';

export type ShellSheet = 'rules' | 'scores' | 'menu' | null;

export function useShellSheets(handlers?: {
  onUndo?: () => void;
  undoDisabled?: boolean;
  onScores?: () => void;
}): {
  sheet: ShellSheet;
  setSheet: (next: ShellSheet | ((prev: ShellSheet) => ShellSheet)) => void;
  actions: GameShellRailActionModel[];
} {
  const [sheet, setSheet] = useState<ShellSheet>(null);
  const actions = shellSheetActions(sheet, {
    onRules: () => setSheet((s) => (s === 'rules' ? null : 'rules')),
    onScores:
      handlers?.onScores ??
      (() => {
        setSheet((s) => (s === 'scores' ? null : 'scores'));
      }),
    onMenu: () => setSheet((s) => (s === 'menu' ? null : 'menu')),
    onUndo: handlers?.onUndo,
    undoDisabled: handlers?.undoDisabled ?? true,
  });
  return { sheet, setSheet, actions };
}
