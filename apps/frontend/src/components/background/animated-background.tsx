'use client';

import { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { GradientOrb } from './gradient-orb';
import { GridPattern } from './grid-pattern';
import { CursorGlow } from './cursor-glow';

const GLOW_SIZE = 560;
// Max px shift for each layer at the viewport edge — deliberately small so this
// reads as "ambient light reacting to you," never as the UI itself moving.
const ORB_PARALLAX_PX = 16;
const GRID_PARALLAX_PX = 6;

/**
 * Single global layer: gradient orbs (slow ambient drift, own per-orb animation),
 * a dot grid (very low opacity, shifts a few px with the pointer), and a cursor
 * glow (spring-follows the pointer, fades out when it leaves the viewport).
 *
 * Pointer tracking uses framer-motion MotionValues updated directly via `.set()`
 * in a native `pointermove` listener — never `useState` — so mouse movement never
 * triggers a React re-render; only the composited transform/opacity styles change.
 */
export function AnimatedBackground() {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const glowOpacity = useMotionValue(0);
  // Separate from the raw pointer position and only ever `.set()` inside the
  // client-only pointermove handler below (never derived via useTransform from
  // `window.innerWidth`) — that keeps their initial value at exactly 0 on both
  // server and client render, which is what avoids a hydration mismatch here.
  const orbParallaxX = useMotionValue(0);
  const orbParallaxY = useMotionValue(0);
  const gridParallaxX = useMotionValue(0);
  const gridParallaxY = useMotionValue(0);

  const springX = useSpring(pointerX, { stiffness: 60, damping: 20, mass: 0.5 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 20, mass: 0.5 });
  const springOrbX = useSpring(orbParallaxX, { stiffness: 40, damping: 20 });
  const springOrbY = useSpring(orbParallaxY, { stiffness: 40, damping: 20 });
  const springGridX = useSpring(gridParallaxX, { stiffness: 40, damping: 20 });
  const springGridY = useSpring(gridParallaxY, { stiffness: 40, damping: 20 });

  const glowX = useTransform(springX, (v) => v - GLOW_SIZE / 2);
  const glowY = useTransform(springY, (v) => v - GLOW_SIZE / 2);

  useEffect(() => {
    if (reducedMotion) return;
    // Cursor-follow is a "nice to have" reserved for devices with a real pointer
    // and enough screen to notice it — skip wiring it up at all on touch/mobile
    // rather than attaching a listener that will barely ever fire usefully.
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hasFinePointer) return;

    const handleMove = (event: PointerEvent) => {
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
      const fractionX = event.clientX / window.innerWidth - 0.5;
      const fractionY = event.clientY / window.innerHeight - 0.5;
      orbParallaxX.set(fractionX * ORB_PARALLAX_PX * 2);
      orbParallaxY.set(fractionY * ORB_PARALLAX_PX * 2);
      gridParallaxX.set(fractionX * GRID_PARALLAX_PX * 2);
      gridParallaxY.set(fractionY * GRID_PARALLAX_PX * 2);
      animate(glowOpacity, 1, { duration: 0.4 });
    };
    const handleLeave = () => {
      animate(glowOpacity, 0, { duration: 0.6 });
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      document.documentElement.removeEventListener('mouseleave', handleLeave);
    };
  }, [reducedMotion, pointerX, pointerY, glowOpacity, orbParallaxX, orbParallaxY, gridParallaxX, gridParallaxY]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <motion.div
        className="absolute inset-0"
        style={reducedMotion ? undefined : { x: springOrbX, y: springOrbY }}
      >
        <GradientOrb
          color="var(--orb-1)"
          size={520}
          path="horizontal"
          duration={26}
          className="top-[-8%] left-[-6%]"
        />
        <GradientOrb
          color="var(--orb-2)"
          size={480}
          path="vertical"
          duration={32}
          delay={2}
          className="right-[-8%] bottom-[-10%]"
        />
        <GradientOrb
          color="var(--orb-3)"
          size={400}
          path="diagonal"
          duration={22}
          delay={4}
          className="top-[20%] right-[8%]"
        />
      </motion.div>

      <GridPattern
        offsetX={reducedMotion ? undefined : springGridX}
        offsetY={reducedMotion ? undefined : springGridY}
      />

      {!reducedMotion && <CursorGlow x={glowX} y={glowY} opacity={glowOpacity} />}
    </div>
  );
}
