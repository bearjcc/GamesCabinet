import type { ReactNode } from 'react';

export type TurnPlateTone = 'you' | 'wait' | 'neutral' | 'done';

export type TurnPlateModel = {
  name: string;
  hint?: string;
  tone: TurnPlateTone;
  seatColour?: string;
  initial?: string;
};

export type SeatChipModel = {
  id: string;
  label: string;
  detail?: string;
  seatColour?: string;
  active?: boolean;
};

export type ScoreboardRowModel = {
  label: string;
  value: ReactNode;
};

export type ScoreboardModel = {
  rows: ScoreboardRowModel[];
  testId?: string;
};

export type RulesPanelModel = {
  title?: string;
  body: ReactNode;
  testId?: string;
};

export type GameShellRailActionId = 'undo' | 'rules' | 'scores' | 'more';

export type GameShellRailActionModel = {
  id: GameShellRailActionId;
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick?: () => void;
};

export type GameShellRailModel = {
  gameTitle: string;
  meta?: ReactNode;
  turnPlate?: TurnPlateModel | null;
  actions: GameShellRailActionModel[];
};

export type GameShellBottomBarModel = {
  actions: GameShellRailActionModel[];
};

export type HandTrayModel = {
  title?: string;
  hint?: string;
  testId?: string;
};

export type BoardStageModel = {
  felt?: 'green' | 'blue' | 'tracks' | false;
};

export type BoardGridCellModel = {
  id: string;
  content: ReactNode;
  ariaLabel?: string;
};

export type BoardGridModel = {
  columns: number;
  rows: number;
  cells: BoardGridCellModel[];
  testId?: string;
  ariaLabel?: string;
  className?: string;
};

export type GameShellConfig = {
  rail: GameShellRailModel;
  stage: BoardStageModel;
  bottomBar?: GameShellBottomBarModel;
  tray?: HandTrayModel | null;
  testId?: string;
};

export type GameShellSlots = {
  board: ReactNode;
  trayContent?: ReactNode;
  underBoard?: ReactNode;
  overlay?: ReactNode;
  rulesSheet?: ReactNode;
  scoresSheet?: ReactNode;
  menuSheet?: ReactNode;
};
