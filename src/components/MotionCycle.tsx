import { useState } from 'react';
import { cycleMotion, getMotion, type MotionIntensity, motionLabel } from '../lib/motion';

export function MotionCycle() {
  const [motion, setMotionState] = useState<MotionIntensity>(() => getMotion());

  return (
    <button
      type="button"
      className="btn ghost motion-cycle"
      data-testid="motion-cycle"
      onClick={() => setMotionState(cycleMotion(motion))}
      aria-label={`Motion ${motionLabel(motion)}. Click to cycle.`}
      title="Cycle motion"
    >
      {motionLabel(motion)}
    </button>
  );
}
