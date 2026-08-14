'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type OrbPath = 'horizontal' | 'vertical' | 'diagonal';

interface GradientOrbProps {
  /** CSS color value (usually a `var(--orb-N)` token) — the orb's core color. */
  color: string;
  /** Diameter in px before blur is applied. */
  size: number;
  /** Positioning classes, e.g. "top-[-10%] left-[5%]". */
  className?: string;
  /** Movement pattern — kept distinct per orb so they never look synchronized. */
  path: OrbPath;
  /** Full loop duration in seconds — slow, ambient-light-like, never rapid. */
  duration: number;
  delay?: number;
}

// How far an orb drifts from its resting position, and how much its scale breathes,
// per path — small relative to `size` so it always reads as ambient light, not a
// moving shape. Diagonal combines both axes at a reduced amplitude on each.
const OFFSETS: Record<OrbPath, { x: number[]; y: number[] }> = {
  horizontal: { x: [0, 48, -32, 0], y: [0, 12, -8, 0] },
  vertical: { x: [0, -14, 10, 0], y: [0, 40, -36, 0] },
  diagonal: { x: [0, 30, -26, 0], y: [0, 26, -22, 0] },
};

export function GradientOrb({ color, size, className, path, duration, delay = 0 }: GradientOrbProps) {
  const reducedMotion = useReducedMotion();
  const offsets = OFFSETS[path];

  return (
    <motion.div
      aria-hidden
      className={cn('absolute rounded-full opacity-30 dark:opacity-45', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${Math.round(size * 0.3)}px)`,
        willChange: 'transform',
      }}
      animate={
        reducedMotion
          ? undefined
          : {
              x: offsets.x,
              y: offsets.y,
              scale: [1, 1.06, 0.97, 1],
            }
      }
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}
