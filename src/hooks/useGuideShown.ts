import { useEffect, useState } from 'react';
import { use3DWorld } from './use3DWorld';

const QUERY = '(min-width: 1280px)';

/**
 * Whether the 3D guide is standing beside the page.
 *
 * Two components depend on this answer and must never disagree: Guide shows
 * the 3D model when it is true, and HeroProfile shows the flat avatar when it
 * is false. They used to decide separately (the hero on "is the world 3D",
 * the guide on "is the window 1280 wide"), and between 769 and 1279px both
 * said no, so he appeared nowhere on his own portfolio.
 *
 * Re-checked on mount as well as on change, because the first render can
 * land before layout, when every width query is answered against 0.
 */
export function useGuideShown(): boolean {
  const in3D = use3DWorld();
  const [wide, setWide] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return wide && in3D;
}
