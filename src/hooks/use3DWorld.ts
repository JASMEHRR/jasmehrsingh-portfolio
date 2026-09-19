import { useEffect, useState } from 'react';
import { is3DWorld } from '../three/mode';

/**
 * is3DWorld(), kept current.
 *
 * is3DWorld() is a plain read, so anything rendering from it has to be told
 * when the answer might have changed. The check on mount is the one that
 * matters: the first render can happen before the document has been laid
 * out, and asking again once it has is what stops a 1280px window being
 * served the 2D fallback for the rest of its life.
 *
 * The one place this decision is made reactive; World and useGuideShown both
 * read it, so a threshold change or another pre-layout fix happens once.
 */
export function use3DWorld(): boolean {
  const [on, setOn] = useState(is3DWorld);
  useEffect(() => {
    const check = () => setOn(is3DWorld());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return on;
}
