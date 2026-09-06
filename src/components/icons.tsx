import {
  mdiAnimation,
  mdiBrightness2,
  mdiCircleOutline,
  mdiCog,
  mdiHelpCircleOutline,
  mdiMoonWaningCrescent,
  mdiMotionPauseOutline,
  mdiPlay,
  mdiRedo,
  mdiRefresh,
  mdiTrophyOutline,
  mdiUndo,
  mdiWhiteBalanceSunny,
} from '@mdi/js';
import Icon from '@mdi/react';
import type { MotionIntensity } from '../lib/motion';
import type { Theme } from '../lib/theme';

type IconProps = {
  className?: string;
};

function Mdi({ path, className }: IconProps & { path: string }) {
  return <Icon path={path} size="1.15rem" className={className} aria-hidden={true} />;
}

export function IconSettings({ className }: IconProps) {
  return <Mdi path={mdiCog} className={className} />;
}

export function IconTheme({ theme, className }: IconProps & { theme: Theme }) {
  const path =
    theme === 'white'
      ? mdiCircleOutline
      : theme === 'light'
        ? mdiWhiteBalanceSunny
        : theme === 'dark'
          ? mdiMoonWaningCrescent
          : mdiBrightness2;
  return <Mdi path={path} className={className} />;
}

export function IconMotion({ intensity, className }: IconProps & { intensity: MotionIntensity }) {
  const path =
    intensity === 'reduced'
      ? mdiMotionPauseOutline
      : intensity === 'playful'
        ? mdiAnimation
        : mdiPlay;
  return <Mdi path={path} className={className} />;
}

export function IconNewGame({ className }: IconProps) {
  return <Mdi path={mdiRefresh} className={className} />;
}

export function IconUndo({ className }: IconProps) {
  return <Mdi path={mdiUndo} className={className} />;
}

export function IconRedo({ className }: IconProps) {
  return <Mdi path={mdiRedo} className={className} />;
}

export function IconScores({ className }: IconProps) {
  return <Mdi path={mdiTrophyOutline} className={className} />;
}

export function IconHelp({ className }: IconProps) {
  return <Mdi path={mdiHelpCircleOutline} className={className} />;
}

export function IconKeepGoing({ className }: IconProps) {
  return <Mdi path={mdiPlay} className={className} />;
}

export function IconTryAgain({ className }: IconProps) {
  return <Mdi path={mdiRefresh} className={className} />;
}
