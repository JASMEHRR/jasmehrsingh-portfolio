import { useEffect, useState } from 'react';

/**
 * Normalised cursor position, -0.5 to 0.5 on each axis, for parallax.
 *
 * Returns a frozen centre when the reader prefers reduced motion, and never
 * attaches the listener at all in that case, so nothing tracks the pointer.
 * Updates are throttled to one per animation frame; the raw mousemove rate is
 * far higher than the screen can show and would re-render for nothing.
 */
export function usePointer() {
  const [point, setPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setPoint({
          x: e.clientX / window.innerWidth - 0.5,
          y: e.clientY / window.innerHeight - 0.5,
        });
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return point;
}
