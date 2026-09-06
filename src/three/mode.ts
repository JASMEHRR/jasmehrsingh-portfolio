/**
 * One decision, shared.
 *
 * Both the backdrop and the hero need to know whether the 3D world is running:
 * the backdrop to mount it, the hero to leave the character out of the HTML
 * because a real model is already standing in the scene. Computing it in one
 * memoised place keeps the two from ever disagreeing and showing the character
 * twice, or not at all.
 */

let cached: boolean | null = null;

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

/** Not a hook: a memoised environment check, safe to call during render. */
export function is3DWorld(): boolean {
  if (cached === null) {
    cached = !window.matchMedia('(max-width: 768px)').matches && hasWebGL();
  }
  return cached;
}
