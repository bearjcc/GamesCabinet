import { readEffectiveMotion } from '../../lib/motion';
import { AnimatedCounter } from '../cinematic';

export type CounterProps = {
  value: number;
  label: string;
  testId?: string;
  /** Larger value weight for stores / primary scores. */
  emphasize?: boolean;
  /** Tween digits via cinematic AnimatedCounter (default true). */
  animate?: boolean;
};

/**
 * Compact labelled numeric readout (resource / pit / score).
 * Owns the Motion seam: boards pass numbers; Counter decides tween vs plain.
 */
export function Counter({ value, label, testId, emphasize = false, animate = true }: CounterProps) {
  const useTween = animate && readEffectiveMotion() !== 'reduced';
  const className = ['tt-counter', emphasize ? 'tt-counter--emphasize' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} data-testid={testId}>
      <span className="tt-counter__label">{label}</span>
      {useTween ? (
        <AnimatedCounter value={value} className="tt-counter__value" />
      ) : (
        <span className="tt-counter__value">{value}</span>
      )}
    </div>
  );
}
