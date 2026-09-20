import { useEffect, useRef } from 'react';

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
 * Lenses are built in idle time, never mid-scroll, and each map only computes
 * the rim band where anything bends, so the work is spread out and small.
 * `version` asks for a rescan after new panels mount, such as the ones the
 * GitHub data adds.
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
 * Only the rim is computed, and only the four corners need a distance field;
 * along the straight edges the pull is straight in. On a large card that is a
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
  // every pixel to (128, 128, 128, 255), "no pull", as one native fill rather
  // than a loop over each byte, which took 10ms on a large card by itself
  new Uint32Array(data.buffer).fill(0xff808080);

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

  // The four corner squares hold the only curved rim, so only they need the
  // distance field. Everywhere else the rim is a straight edge, and the pull
  // is straight in from it: the same answer the field gives, for a fraction
  // of the work.
  const band = Math.ceil(bezel + r);
  const bx = Math.min(band, Math.ceil(hx));
  const by = Math.min(band, Math.ceil(hy));
  for (const [y0, y1] of [[0, by], [h - by, h]]) {
    for (const [x0, x1] of [[0, bx], [w - bx, w]]) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
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
    }
  }
  const edge = Math.ceil(bezel);
  // top and bottom edges, between the corners
  for (let y = 0; y < Math.min(edge, by); y++) {
    for (const row of y === h - 1 - y ? [y] : [y, h - 1 - y]) {
      const d = Math.min(row + 0.5, h - row - 0.5);
      if (d >= bezel) continue;
      const t = 1 - d / bezel;
      for (let x = bx; x < w - bx; x++) put(x, row, 0, (row < hy ? 1 : -1) * t * t);
    }
  }
  // left and right edges, between the corners
  for (let x = 0; x < Math.min(edge, bx); x++) {
    for (const col of x === w - 1 - x ? [x] : [x, w - 1 - x]) {
      const d = Math.min(col + 0.5, w - col - 0.5);
      if (d >= bezel) continue;
      const t = 1 - d / bezel;
      for (let y = by; y < h - by; y++) put(col, y, (col < hx ? 1 : -1) * t * t, 0);
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
  // set up once; later calls with a new `version` only pick up the panels
  // that have appeared since, rather than rebuilding every lens from scratch
  const scanRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!CHROMIUM || !('ResizeObserver' in window) || !('requestIdleCallback' in window)) return;

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
          // --g-tint is the colour work all glass shares; see glass.css
          `url(#${id}) blur(${pill ? 3 : 8}px) var(--g-tint)`,
        );
        lens = { image, key: '' };
        lenses.set(el, lens);
      }

      lens.image.setAttribute('width', String(w));
      lens.image.setAttribute('height', String(h));
      lens.image.setAttribute('href', lensMap(w, h, radius, bezel));
      lens.key = key;
    };

    // Maps are built in idle time and never during a scroll. They used to be
    // built as each panel came near the screen, which is to say mid-scroll,
    // several at once as a row of cards arrived, at up to 36ms each: the page
    // stalled right where it should have been revealing the next section.
    // Mid-scroll the panels do not show their lens anyway (see onScroll).
    const queue = new Set<HTMLElement>();
    let idle = 0;
    let scrolling = false;
    const pump = (deadline: IdleDeadline) => {
      idle = 0;
      if (scrolling) return; // picked up again when the scroll settles
      for (const el of queue) {
        queue.delete(el);
        build(el);
        if (deadline.timeRemaining() < 4) break;
      }
      if (queue.size > 0) schedule();
    };
    const schedule = () => {
      if (!idle && !scrolling) idle = requestIdleCallback(pump, { timeout: 300 });
    };
    const enqueue = (el: HTMLElement) => {
      queue.add(el);
      schedule();
    };

    // a new size needs a new map; build() skips it if nothing actually changed
    const resize = new ResizeObserver((entries) => {
      for (const e of entries) enqueue(e.target as HTMLElement);
    });

    const selector = everyPanel() ? '[data-lens], .glass' : '[data-lens]';
    const seen = new WeakSet<HTMLElement>();
    const scan = () => {
      const fresh: { el: HTMLElement; onScreen: boolean }[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        if (seen.has(el)) continue;
        seen.add(el);
        // a glass chip inside a glass card has only the card's flat tint
        // behind it, nothing to bend; glass.css drops its backdrop filter
        if (el.parentElement?.closest('.glass')) continue;
        const r = el.getBoundingClientRect();
        fresh.push({ el, onScreen: r.bottom > 0 && r.top < window.innerHeight });
      }
      // what is on screen first (the nav, and wherever the page opened),
      // then the rest from the top down
      fresh.sort((a, b) => Number(b.onScreen) - Number(a.onScreen));
      for (const { el, onScreen } of fresh) {
        // The nav and the hero's pills on screen bend from the first frame,
        // not frosted until the first idle moment and then visibly clearing.
        // They are small, so building them now costs next to nothing.
        if (onScreen && el.hasAttribute('data-lens')) build(el);
        else enqueue(el);
        resize.observe(el);
      }
    };
    scan();
    scanRef.current = scan;

    // While the page scrolls, every refracting panel re-runs its filter each
    // frame over a backdrop that is moving under it. Panels fall back to a
    // plain tint for the length of a scroll (html.g-scrolling, which
    // useScrollState in motion.ts sets, see glass.css) and bend again once it
    // settles; the nav and the hero's pills keep refracting throughout, since
    // the page bending under the nav as it scrolls is the effect worth paying
    // for. This is the same span of time, for a different reason: no map is
    // built while the page is moving.
    let settle = 0;
    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        cancelIdleCallback(idle);
        idle = 0;
      }
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        scrolling = false;
        schedule();
      }, 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scanRef.current = null;
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(settle);
      cancelIdleCallback(idle);
      queue.clear();
      resize.disconnect();
      for (const el of lenses.keys()) el.style.removeProperty('backdrop-filter');
      svg.remove();
    };
  }, []);

  useEffect(() => {
    scanRef.current?.();
  }, [version]);
}
