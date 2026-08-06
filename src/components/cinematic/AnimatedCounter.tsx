import { animate } from 'motion';
import { useEffect, useRef, useState } from 'react';
import { AnimationQueue, countDurationMs, countPrimitive, displayCount } from '../../lib/cinematic';
import { type MotionIntensity, motionEase, readEffectiveMotion } from '../../lib/motion';

export type AnimatedCounterProps = {
  value: number;
  /** Override intensity; defaults to effective preference. */
  intensity?: MotionIntensity;
  className?: string;
  /** Optional formatter for the displayed integer. */
  format?: (n: number) => string;
};

function resolveIntensity(override?: MotionIntensity): MotionIntensity {
  return override ?? readEffectiveMotion();
}

/**
 * Smallest useful cinematic consumer: ticks from the previous displayed value
 * to `value` via the `count` primitive and `AnimationQueue`.
 *
 * Latest-wins: a new `value` mid-tick interrupts and starts from the live
 * displayed number toward the new target (or snaps when reduced).
 */
export function AnimatedCounter({
  value,
  intensity: intensityProp,
  className,
  format = String,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const intensityRef = useRef(intensityProp);
  intensityRef.current = intensityProp;
  const stopRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<AnimationQueue | null>(null);

  if (queueRef.current === null) {
    queueRef.current = new AnimationQueue({
      intensity: () => resolveIntensity(intensityRef.current),
      play: async (item, ctx) => {
        if (item.primitive.kind !== 'count') return;
        const { from, to } = item.primitive;
        const durationMs = countDurationMs(from, to, ctx.intensity);
        if (durationMs === 0) {
          displayRef.current = to;
          setDisplay(to);
          return;
        }

        await new Promise<void>((resolve) => {
          const controls = animate(from, to, {
            duration: durationMs / 1000,
            ease: motionEase(ctx.intensity),
            onUpdate: (latest) => {
              if (ctx.isInterrupted()) {
                controls.stop();
                return;
              }
              const t = to === from ? 1 : (latest - from) / (to - from);
              const rounded = displayCount(from, to, t);
              displayRef.current = rounded;
              setDisplay(rounded);
            },
            onComplete: () => {
              displayRef.current = to;
              setDisplay(to);
              resolve();
            },
            onStop: () => resolve(),
          });
          stopRef.current = () => controls.stop();
        });
        stopRef.current = null;
      },
    });
  }

  useEffect(() => {
    const queue = queueRef.current;
    if (!queue) return;
    if (value === displayRef.current) return;

    const intensity = resolveIntensity(intensityProp);
    if (intensity === 'reduced') {
      stopRef.current?.();
      queue.skipAll();
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    stopRef.current?.();
    queue.replaceWith(countPrimitive(displayRef.current, value));
  }, [value, intensityProp]);

  useEffect(() => {
    return () => {
      stopRef.current?.();
      queueRef.current?.skipAll();
    };
  }, []);

  return (
    <span className={className} data-testid="animated-counter" data-cinematic="count">
      {format(display)}
    </span>
  );
}
