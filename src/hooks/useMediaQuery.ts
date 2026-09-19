import { useEffect, useState } from 'react';

/**
 * A media query's current answer, kept up to date.
 *
 * Re-synced on mount as well as on change: the initial read happens during
 * the first render, which can land before layout, when width queries are
 * answered against a viewport of 0.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return matches;
}
