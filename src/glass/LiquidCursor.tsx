import { useEffect, useRef } from 'react';
import { domeMap } from './liquidLens';

/** Diameter of the lens at rest, in CSS pixels. */
const SIZE = 30;

/**
 * A droplet of liquid glass that follows the pointer.
 *
 * Not the lens that was removed earlier: that one only blurred what was under
 * it and read as a grey ball. This one is clear and magnifies. A dome-shaped
 * displacement map enlarges whatever is beneath it and bends it hardest at the
 * rim, the way a drop of water does, with a lit edge on top. It also moves
 * like a liquid: it stretches along the direction it is travelling in
 * proportion to its speed and springs round again when it stops, swells over
 * anything clickable, and squashes when pressed.
 *
 * The caller only mounts it where it can actually refract (Chromium, a mouse,
 * motion on). Anywhere else it would fall back to being the plain ball again,
 * so it is better absent. The system cursor stays visible underneath it.
 */
export default function LiquidCursor() {
  const lens = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = lens.current;
    if (!el) return;

    // its own filter: the map never changes size, because growing and
    // squashing are done with transform, which the backdrop filter follows
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML = `<filter id="g-drop" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage href="${domeMap(SIZE)}" x="0" y="0" width="${SIZE}" height="${SIZE}" preserveAspectRatio="none" result="map"/>
      <feDisplacementMap in="SourceGraphic" in2="map" scale="20" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
    document.body.appendChild(svg);

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let size = 1;
    let sizeTarget = 1;
    let press = 1;
    let raf = 0;
    let seen = false;

    const tick = () => {
      raf = 0;
      const px = x;
      const py = y;
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      size += (sizeTarget - size) * 0.2;

      // stretch along the direction of travel, thinner across it, so the
      // volume looks constant: a droplet, not a balloon
      const vx = x - px;
      const vy = y - py;
      const speed = Math.min(Math.hypot(vx, vy), 40);
      const stretch = 1 + speed * 0.018;
      const angle = Math.atan2(vy, vx);
      el.style.setProperty('--a', `${angle}rad`);
      el.style.transform =
        `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad) ` +
        `scale(${(size * press * stretch).toFixed(3)}, ${(size * press / stretch).toFixed(3)})`;

      const moving =
        Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 || Math.abs(sizeTarget - size) > 0.005 || speed > 0.2;
      if (moving) raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        seen = true;
        x = tx;
        y = ty;
      }
      el.classList.remove('gone');
      const over = (e.target as Element | null)?.closest('a, button, [role="button"]');
      sizeTarget = over ? 1.6 : 1;
      schedule();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      press = 0.78;
      schedule();
    };
    const onUp = () => {
      press = 1;
      schedule();
    };
    // released outside the window, or cancelled by a context menu, the page
    // never sees pointerup; leaving or losing focus un-squashes it as well
    const onLeave = () => {
      el.classList.add('gone');
      onUp();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      svg.remove();
    };
  }, []);

  return (
    <div
      ref={lens}
      className="g-drop gone"
      style={{ width: SIZE, height: SIZE, marginLeft: -SIZE / 2, marginTop: -SIZE / 2 }}
      aria-hidden
    />
  );
}
