'use client';

import { motion, type MotionValue } from 'framer-motion';

interface GridPatternProps {
  /** Shared pointer-driven motion values (already scaled down to a few px) — omit for a static grid. */
  offsetX?: MotionValue<number>;
  offsetY?: MotionValue<number>;
}

const CELL = 44;

export function GridPattern({ offsetX, offsetY }: GridPatternProps) {
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0"
      style={{
        x: offsetX,
        y: offsetY,
        backgroundImage:
          'radial-gradient(circle, var(--grid-line) 1px, transparent 1px)',
        backgroundSize: `${CELL}px ${CELL}px`,
        // Fades the pattern out toward the viewport edges so it reads as depth
        // under the content rather than a grid that stops abruptly.
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 90%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 90%)',
      }}
    />
  );
}
