import { type HTMLMotionProps, motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { type CinematicKind, primitiveProfile } from '../../lib/cinematic';
import { type MotionIntensity, readEffectiveMotion } from '../../lib/motion';

type PrimitiveProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Override intensity; defaults to effective preference. */
  intensity?: MotionIntensity;
  /** When false, render children without Motion (already at rest). */
  active?: boolean;
} & Omit<HTMLMotionProps<'div'>, 'children' | 'animate' | 'initial' | 'transition'>;

type TransformTarget = NonNullable<HTMLMotionProps<'div'>['animate']>;

const REST: TransformTarget = {
  x: 0,
  y: 0,
  rotate: 0,
  rotateY: 0,
  scale: 1,
};

const ACTIVE_TRANSFORMS: Record<CinematicKind, TransformTarget> = {
  lift: { ...REST, y: -10 },
  drop: { ...REST, y: 10 },
  snap: { ...REST, scale: 1.04 },
  deal: { ...REST, y: -16, rotate: -4 },
  flip: { ...REST, rotateY: 180 },
  fan: { ...REST, rotate: -8, x: -6 },
  stack: { ...REST, y: 4, scale: 0.98 },
  roll: { ...REST, rotate: 360 },
  count: REST,
};

function profileFor(kind: CinematicKind, intensity?: MotionIntensity) {
  return primitiveProfile(kind, intensity ?? readEffectiveMotion());
}

function CinematicPrimitive({
  kind,
  children,
  className,
  style,
  intensity,
  active = true,
  ...rest
}: PrimitiveProps & { kind: CinematicKind }) {
  const profile = profileFor(kind, intensity);

  if (!profile.animate || !active) {
    return (
      <div className={className} style={style} data-cinematic={kind} data-motion="reduced">
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      data-cinematic={kind}
      initial={REST}
      animate={ACTIVE_TRANSFORMS[kind]}
      transition={{
        duration: profile.durationMs / 1000,
        ease: profile.ease,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Lift(props: PrimitiveProps) {
  return <CinematicPrimitive kind="lift" {...props} />;
}

export function Drop(props: PrimitiveProps) {
  return <CinematicPrimitive kind="drop" {...props} />;
}

export function Snap(props: PrimitiveProps) {
  return <CinematicPrimitive kind="snap" {...props} />;
}

export function Deal(props: PrimitiveProps) {
  return <CinematicPrimitive kind="deal" {...props} />;
}

export function Flip(props: PrimitiveProps) {
  return <CinematicPrimitive kind="flip" {...props} />;
}

export function Fan(props: PrimitiveProps) {
  return <CinematicPrimitive kind="fan" {...props} />;
}

export function Stack(props: PrimitiveProps) {
  return <CinematicPrimitive kind="stack" {...props} />;
}

export function Roll(props: PrimitiveProps) {
  return <CinematicPrimitive kind="roll" {...props} />;
}
