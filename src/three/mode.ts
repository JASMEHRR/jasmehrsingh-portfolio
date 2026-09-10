/**
 * One decision, shared.
 *
 * Both the backdrop and the hero need to know whether the 3D world is running:
 * the backdrop to mount it, the hero to leave the character out of the HTML
 * because a real model is already standing in the scene. Computing it in one
 * memoised place keeps the two from ever disagreeing and showing the character
 * twice, or not at all.
 */

/**
 * Only the WebGL probe is cached. Whether the viewport is big enough is asked
 * fresh every time, because it changes - and because a document that has not
 * been laid out yet reports a width of 0.
 */
let webgl: boolean | null = null;

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
 * Not a hook: an environment check, safe to call during render.
 *
 * This used to cache its whole answer on first call, which quietly broke the
 * site in any context where the first render happens before layout - a
 * just-restored background tab, an embedded webview, a preview pane. There the
 * viewport reports 0, `(max-width: 768px)` matches, and the page committed to
 * the 2D fallback for the rest of its life even once the window was plainly
 * 1280 wide. A width of 0 means "not measured yet", not "small", so it is
 * treated as roomy and simply asked again on the next render.
 *
 * Callers must re-render on resize for this to be worth anything; see World.tsx.
 */
export function is3DWorld(): boolean {
  if (webgl === null) webgl = hasWebGL();
  const width = window.innerWidth || document.documentElement.clientWidth;
  return (width === 0 || width > 768) && webgl;
}
