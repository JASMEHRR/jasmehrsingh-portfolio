import type { CSSProperties } from 'react';

/** A spinning Minecraft grass block, built in CSS 3D from the world's textures. */
export function GrassCube({ size = 56 }: { size?: number }) {
  const s = { '--s': `${size}px` } as CSSProperties;
  return (
    <span className="g-cube-wrap" style={s} aria-hidden>
      <span className="g-cube" style={s}>
        <span className="g-face top" />
        <span className="g-face bottom" />
        <span className="g-face front" />
        <span className="g-face back" />
        <span className="g-face right" />
        <span className="g-face left" />
      </span>
    </span>
  );
}
