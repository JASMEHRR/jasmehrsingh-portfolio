import { lazy, Suspense, useState } from 'react';
import World2D from './World2D';

const World3D = lazy(() => import('./World3D'));

/** Cheap probe: does this browser actually give us a WebGL context? */
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

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
  // decided once in a lazy initialiser: the answer cannot change without a
  // reload, and doing it in an effect would render the 2D world first and
  // then swap, which flashes
  const [use3D] = useState(
    () => !window.matchMedia('(max-width: 768px)').matches && hasWebGL(),
  );

  if (!use3D) return <World2D />;

  return (
    <Suspense fallback={<World2D />}>
      <World3D />
    </Suspense>
  );
}
