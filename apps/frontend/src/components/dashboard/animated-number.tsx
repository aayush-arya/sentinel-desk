'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 600;
const STEP_MS = 16;

// Counts up via setInterval rather than requestAnimationFrame. rAF is tied to
// the browser's paint/compositing cycle, which some automated/backgrounded
// tab environments throttle or suspend entirely — setInterval keeps firing
// regardless, and a 600ms count-up doesn't need true frame-perfect timing.
export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const from = fromRef.current;
    if (reducedMotionRef.current || from === value) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      const progress = Math.min((Date.now() - start) / DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress >= 1) {
        fromRef.current = value;
        clearInterval(interval);
      }
    }, STEP_MS);
    return () => clearInterval(interval);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}
