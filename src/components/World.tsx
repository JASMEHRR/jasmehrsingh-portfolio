import { lazy, Suspense, useEffect, useState } from 'react';
import World2D from './World2D';
import { is3DWorld } from '../three/mode';

const World3D = lazy(() => import('./World3D'));

/**
 * Picks a backdrop.
 *
 * The 3D world is skipped only when the browser has no WebGL, or on small
 * screens where a voxel scene costs more battery than it returns.
 *
 * Reduced motion deliberately does NOT drop to 2D. That preference asks for
 * less movement, not less world: World3D reads it and snaps the camera between
 * zones instead of gliding, and stops the drifting particles. Dropping the
 * whole scene would hide the site's main idea from the people most likely to
 * have the preference switched on.
 *
 * The 2D world remains a genuine fallback rather than a blank: same biomes,
 * same palette, same textures, just flat.
 */
export default function World() {
  // is3DWorld() is a plain read, so this component has to be told when the
  // answer might have changed. The check on mount is the one that matters:
  // the first render can happen before the document has been laid out, and
  // asking again once it has is what stops a 1280px window being served the
  // 2D fallback for the rest of its life.
  const [on, setOn] = useState(is3DWorld);
  useEffect(() => {
    const check = () => setOn(is3DWorld());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!on) return <World2D />;

  return (
    <Suspense fallback={<World2D />}>
      <World3D />
    </Suspense>
  );
}
