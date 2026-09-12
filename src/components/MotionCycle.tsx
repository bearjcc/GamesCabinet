import { useState } from 'react';
import { cycleMotion, getMotion, type MotionIntensity, motionLabel } from '../lib/motion';
import { IconButton } from './IconControl';
import { IconMotion } from './icons';

export function MotionCycle() {
  const [motion, setMotionState] = useState<MotionIntensity>(() => getMotion());

  return (
    <IconButton
      label={`Motion ${motionLabel(motion)}. Click to cycle.`}
      title="Cycle motion"
      testId="motion-cycle"
      onClick={() => setMotionState(cycleMotion(motion))}
    >
      <IconMotion intensity={motion} />
    </IconButton>
  );
}
