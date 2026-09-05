import { useReducedMotion } from 'framer-motion';

/**
 * Entrance animation props for section content.
 *
 * MotionConfig reducedMotion="user" is NOT usable here: it disables the
 * transform animation but leaves the element parked on its `initial` state,
 * so everything stays at opacity 0 and the page renders blank for anyone
 * with the preference on. Instead we drop the animation props entirely when
 * reduced motion is requested, so the content is simply there, fully visible,
 * with no motion at all.
 */
const EASE = [0.22, 1, 0.36, 1] as const;

/** Reveals when scrolled into view. */
export function useEntrance(index = 0) {
  const reduced = useReducedMotion();
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.5, delay: Math.min(index * 0.06, 0.3), ease: EASE },
  } as const;
}

/** Reveals on mount — used above the fold, where whileInView would be late. */
export function useEntranceOnMount(delay = 0) {
  const reduced = useReducedMotion();
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  } as const;
}
