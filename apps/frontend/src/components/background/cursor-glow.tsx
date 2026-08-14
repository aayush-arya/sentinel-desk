'use client';

import { motion, type MotionValue } from 'framer-motion';

interface CursorGlowProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
  opacity: MotionValue<number>;
}

const SIZE = 560;

// `x`/`y` are expected to already be offset by the caller (pointer position minus
// half the glow's size), so this component can stay a dumb "place me at x,y" box —
// mixing framer-motion's `x`/`y` transform shorthand with a separate translateX/Y
// percentage on the same element isn't a supported combination.
export function CursorGlow({ x, y, opacity }: CursorGlowProps) {
  return (
    <motion.div
      aria-hidden
      className="absolute top-0 left-0 rounded-full"
      style={{
        width: SIZE,
        height: SIZE,
        x,
        y,
        opacity,
        background: 'radial-gradient(circle, var(--glow-color) 0%, transparent 72%)',
        willChange: 'transform, opacity',
      }}
    />
  );
}
