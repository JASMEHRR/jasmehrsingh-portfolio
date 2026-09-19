import { useEffect } from 'react';

/**
 * Real refraction on the glass, the thing that makes it liquid glass rather
 * than frosted glass.
 *
 * Frosted glass only blurs what is behind it. Liquid glass bends it: near the
 * rim the background is pulled inward, like light through the curved edge of
 * a lens, so a colour or a line passing under a panel visibly kinks at its
 * border. This does that with an SVG displacement filter, fed a displacement
 * map computed for each element's exact size and corner radius, and applied as
 * the element's backdrop-filter.
 *
 * Where it applies:
 *   - elements marked `data-lens` (the nav bar and the hero's pills) always
 *   - every other glass panel too, on a machine that can afford it: a mouse
 *     for a pointer and more than four cores. Phones and low-power laptops
 *     keep the lens on the nav and hero only, because a displacement filter
 *     costs far more than a blur and scrolling has to stay smooth.
 *
 * Chromium only: it is the one engine that runs SVG filters inside
 * backdrop-filter. Safari and Firefox keep the stylesheet's frosted blur,
 * which is a fallback, not a failure.
 *
 * Each panel is only given its lens when it first comes near the viewport,
 * and each map only computes the rim band where anything bends, so the work
 * is spread out and small. `version` asks for a rescan after new panels mount,
 * such as the ones the GitHub data adds.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
export const CHROMIUM = /\b(Chrome|Chromium)\//.test(navigator.userAgent);

function everyPanel(): boolean {
  const cores = navigator.hardwareConcurrency || 4;
  return cores > 4 && window.matchMedia('(pointer: fine) and (hover: hover)').matches;
}

/**
 * A displacement map for a w x h rounded rectangle, as a PNG data URL.
 *
 * Red and green carry the x and y pull (128 means none). Inside a bezel along
 * the rim, pixels pull toward the centre, hardest at the very edge and falling
 * off with the square of the distance, the profile of a lens edge rather than
 * a flat bevel. The middle is left untouched, so the glass stays clear.
 *
 * Only the rim is computed: the top and bottom bands (which hold the rounded
 * corners) in full, and in between just the left and right strips, where the
 * edge is straight and the pull is purely sideways. On a large card that is a
 * small fraction of the pixels.
 */
export function lensMap(w: number, h: number, radius: number, bezel: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 128;
    data[i + 3] = 255;
  }

  const hx = w / 2;
  const hy = h / 2;
  const r = Math.min(radius, hx, hy);
  const sd = (x: number, y: number) => {
    const qx = Math.abs(x - hx) - (hx - r);
    const qy = Math.abs(y - hy) - (hy - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  const put = (x: number, y: number, vx: number, vy: number) => {
    const i = (y * w + x) * 4;
    data[i] = Math.round(128 + vx * 127);
    data[i + 1] = Math.round(128 + vy * 127);
  };

  const band = Math.ceil(bezel + r);
  for (let y = 0; y < h; y++) {
    const inCornerRows = y < band || y >= h - band;
    for (let x = 0; x < w; x++) {
      if (!inCornerRows) {
        // straight left and right edges: skip the clear middle entirely
        if (x >= bezel && x < w - bezel) {
          x = Math.max(x, Math.floor(w - bezel) - 1);
          continue;
        }
        const d = Math.min(x + 0.5, w - x - 0.5);
        if (d >= bezel) continue;
        const t = 1 - d / bezel;
        put(x, y, (x < hx ? 1 : -1) * t * t, 0);
        continue;
      }
      const px = x + 0.5;
      const py = y + 0.5;
      const d = -sd(px, py);
      if (d <= 0 || d >= bezel) continue;
      const gx = sd(px + 1, py) - sd(px - 1, py);
      const gy = sd(px, py + 1) - sd(px, py - 1);
      const len = Math.hypot(gx, gy) || 1;
      const t = 1 - d / bezel;
      put(x, y, (-gx / len) * t * t, (-gy / len) * t * t);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * A displacement map for a round magnifying lens of diameter `size`.
 *
 * Unlike the panels, which only bend at the rim, the cursor lens is a dome:
 * every pixel samples from closer to the centre than it sits, which enlarges
 * whatever is underneath, and the pull grows sharply toward the edge where a
 * real droplet bends light hardest.
 */
export function domeMap(size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const rn = Math.hypot(dx, dy) / c;
      let vx = 0;
      let vy = 0;
      if (rn > 0 && rn < 1) {
        const m = 0.45 * rn + 0.55 * rn ** 4;
        vx = (-dx / (rn * c)) * m;
        vy = (-dy / (rn * c)) * m;
      }
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(128 + vx * 127);
      img.data[i + 1] = Math.round(128 + vy * 127);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

interface Lens {
  image: SVGFEImageElement;
  key: string;
}

export function useLiquidLens(version: unknown = 0) {
  useEffect(() => {
    if (!CHROMIUM || !('ResizeObserver' in window) || !('IntersectionObserver' in window)) return;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    document.body.appendChild(svg);

    const lenses = new Map<HTMLElement, Lens>();
    let seq = 0;

    const build = (el: HTMLElement) => {
      // offset sizes ignore transforms, so the tilt and the magnet do not
      // regenerate the map every frame
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // chips and tiny pills: too small for a bend to read, not worth a filter
      if (w < 40 || h < 30) return;
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      const key = `${w}x${h}x${radius}`;
      let lens = lenses.get(el);
      if (lens?.key === key) return;

      // the nav and the hero's pills stay almost clear; panels that carry
      // paragraphs keep more blur so the text on them stays easy to read
      const pill = el.hasAttribute('data-lens');
      const bezel = Math.max(6, Math.min(pill ? 22 : 26, h * 0.42, w * 0.2));
      const shift = pill ? 18 : 14;

      if (!lens) {
        const id = `g-lens-${seq++}`;
        const filter = document.createElementNS(SVG_NS, 'filter');
        filter.setAttribute('id', id);
        filter.setAttribute('x', '0');
        filter.setAttribute('y', '0');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        const image = document.createElementNS(SVG_NS, 'feImage');
        image.setAttribute('x', '0');
        image.setAttribute('y', '0');
        image.setAttribute('preserveAspectRatio', 'none');
        image.setAttribute('result', 'map');
        const displace = document.createElementNS(SVG_NS, 'feDisplacementMap');
        displace.setAttribute('in', 'SourceGraphic');
        displace.setAttribute('in2', 'map');
        displace.setAttribute('scale', String(shift * 2));
        displace.setAttribute('xChannelSelector', 'R');
        displace.setAttribute('yChannelSelector', 'G');
        filter.append(image, displace);
        svg.appendChild(filter);
        el.style.setProperty(
          'backdrop-filter',
          `url(#${id}) blur(${pill ? 3 : 10}px) saturate(180%) brightness(1.08)`,
        );
        lens = { image, key: '' };
        lenses.set(el, lens);
      }

      lens.image.setAttribute('width', String(w));
      lens.image.setAttribute('height', String(h));
      lens.image.setAttribute('href', lensMap(w, h, radius, bezel));
      lens.key = key;
    };

    const resize = new ResizeObserver((entries) => {
      for (const e of entries) if (lenses.has(e.target as HTMLElement)) build(e.target as HTMLElement);
    });
    // a panel gets its lens the first time it comes near the screen
    const near = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          near.unobserve(el);
          start(el);
        }
      },
      { rootMargin: '300px 0px' },
    );

    const start = (el: HTMLElement) => {
      build(el);
      resize.observe(el);
    };

    // Whatever is already on screen (the nav bar, the hero) gets its lens
    // straight away rather than a frame later, when the observer first
    // reports; everything further down waits until it comes near.
    const selector = everyPanel() ? '[data-lens], .glass' : '[data-lens]';
    const margin = 300;
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      if (r.bottom > -margin && r.top < window.innerHeight + margin) start(el);
      else near.observe(el);
    }

    return () => {
      near.disconnect();
      resize.disconnect();
      for (const el of lenses.keys()) el.style.removeProperty('backdrop-filter');
      svg.remove();
    };
  }, [version]);
}
