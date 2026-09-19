import { useEffect, useRef } from 'react';

/**
 * A glass lens that trails the pointer.
 *
 * It follows with a little lag, swells over anything clickable, and feeds the
 * hovered glass panel its --mx/--my so the panel's sheen tracks the pointer.
 * The system cursor stays visible: this decorates it rather than replacing
 * it, so nobody loses track of where they are pointing.
 *
 * Only mounted for a fine pointer that can hover, and only while motion is
 * on. A lens that snapped to the pointer would add nothing, and on a touch
 * screen there is no pointer to trail.
 *
 * The SVG filter defined here is what the lens's backdrop-filter bends the
 * page through; see .g-lens in glass.css.
 */
export default function Cursor() {
  const lens = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = lens.current;
    if (!el) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;
    let seen = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        // jump to the first position rather than gliding in from the centre
        seen = true;
        x = tx;
        y = ty;
      }
      // every move, not just the first: pointerleave hides it again
      el.classList.remove('gone');
      const target = e.target as Element | null;
      el.classList.toggle('hot', Boolean(target?.closest('a, button, [role="button"]')));

      const panel = target?.closest<HTMLElement>('.glass');
      if (panel) {
        const r = panel.getBoundingClientRect();
        panel.style.setProperty('--mx', `${e.clientX - r.left}px`);
        panel.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
    };
    const onLeave = () => el.classList.add('gone');

    const tick = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="g-liquid" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="28" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div ref={lens} className="g-lens gone" aria-hidden />
    </>
  );
}
