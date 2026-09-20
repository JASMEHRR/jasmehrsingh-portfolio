import { useEffect } from 'react';

/**
 * Everything the cursor does to the glass page, without a cursor of its own.
 *
 * There used to be a lens that trailed the pointer. The lens is gone; the
 * effects around it are kept and extended:
 *
 *   - sheen: each glass panel catches the light where the pointer is
 *   - tilt: the panel under the pointer leans toward it, in 3D, and lifts
 *   - magnet: buttons and nav links are pulled a little toward the pointer
 *   - glow: a soft light trails the pointer behind the glass, so panels light
 *     up as it passes under them (it sits in the backdrop, not on top)
 *   - parallax: the colour blobs and the hero's lines drift with the mouse,
 *     each by a different amount, which gives the page depth
 *   - ripple: pressing on any glass surface sends a ripple across it
 *
 * One requestAnimationFrame loop does all of it. Each frame reads every rect
 * it needs first and writes styles after, so the browser lays out once per
 * frame rather than once per effect. The loop only runs while something is
 * still moving: the pointer has moved, the page has scrolled under a still
 * pointer, or the glow has not yet caught up.
 *
 * Only mounted for a mouse (a fine pointer that can hover) with motion on.
 */

// not a dialog: the password prompt leaning about while you type in it
const PANEL = '.glass:not(.glass-pill, dialog)';
const MAGNET = 'a.glass-pill, button.glass-pill, [data-magnet]';

/**
 * Safari (desktop WebKit) has a history of dropping or flattening
 * backdrop-filter on elements with a 3D transform, which would turn a frosted
 * card clear the moment it tilts. There it gets a flat lean instead.
 */
const FLAT_TILT =
  /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|OPR/.test(navigator.userAgent);

/** How long after the last scroll event the page still counts as scrolling. */
const SCROLL_SETTLE_MS = 160;

export function useCursorFx(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const backdrop = document.querySelector<HTMLElement>('.g-backdrop');
    const glow = document.querySelector<HTMLElement>('.g-glow');
    const hero = document.querySelector<HTMLElement>('.g-hero');

    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    let gx = px;
    let gy = py;
    let target: Element | null = null;
    let active = false;
    let raf = 0;
    let tilted: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;
    let retarget = false;
    let lastScroll = 0;

    const release = (el: HTMLElement | null) => {
      if (el) el.style.transform = '';
    };

    const frame = () => {
      raf = 0;
      if (!active) return;

      // ---- reads ----
      if (retarget) {
        // resolved here, once a frame, rather than on every scroll event
        retarget = false;
        target = document.elementFromPoint(px, py);
      }
      // a node the page has since removed is not under the pointer any more
      if (target && !target.isConnected) target = null;
      let panel = target?.closest<HTMLElement>(PANEL) ?? null;
      // not a panel that has yet to fade in: it would arrive already leaning
      if (panel?.closest('.reveal:not(.in)')) panel = null;
      const pull = target?.closest<HTMLElement>(MAGNET) ?? null;
      const scrolling = performance.now() - lastScroll < SCROLL_SETTLE_MS;
      const pr = panel?.getBoundingClientRect();
      const mr = pull?.getBoundingClientRect();
      const w = window.innerWidth;
      const h = window.innerHeight;

      // ---- writes ----
      // The glow and the blob parallax move the backdrop, and every glass
      // panel re-blurs whatever moves behind it. Scrolling already makes them
      // re-blur each frame, so these hold still until a scroll settles rather
      // than doubling that cost exactly when smoothness matters most.
      if (!scrolling) {
        gx += (px - gx) * 0.14;
        gy += (py - gy) * 0.14;
        if (glow) glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;

        const cx = (px / w - 0.5).toFixed(3);
        const cy = (py / h - 0.5).toFixed(3);
        backdrop?.style.setProperty('--cx', cx);
        backdrop?.style.setProperty('--cy', cy);
        hero?.style.setProperty('--cx', cx);
        hero?.style.setProperty('--cy', cy);
      }

      if (panel !== tilted) {
        release(tilted);
        tilted = panel;
      }
      if (panel && pr && pr.width > 0 && pr.height > 0) {
        const x = px - pr.left;
        const y = py - pr.top;
        panel.style.setProperty('--mx', `${x}px`);
        panel.style.setProperty('--my', `${y}px`);
        // big panels tilt less, or a full-width panel swings like a door:
        // a stat tile leans the full 10 degrees, a wide project card about 4
        const max = Math.min(10, 4800 / (pr.width + pr.height));
        const nx = x / pr.width - 0.5;
        const ny = y / pr.height - 0.5;
        panel.style.transform = FLAT_TILT
          ? `translate(${(nx * max * 1.2).toFixed(1)}px, ${(ny * max * 1.2).toFixed(1)}px) scale(1.015)`
          : `perspective(1000px) rotateX(${(-ny * 2 * max).toFixed(2)}deg) rotateY(${(nx * 2 * max).toFixed(2)}deg) scale(1.015)`;
      }

      if (pull !== magnet) {
        release(magnet);
        magnet = pull;
      }
      if (pull && mr && mr.width > 0) {
        const dx = px - (mr.left + mr.width / 2);
        const dy = py - (mr.top + mr.height / 2);
        pull.style.transform = `translate(${(dx * 0.28).toFixed(1)}px, ${(dy * 0.38 - 2).toFixed(1)}px)`;
      }

      // keep going until the glow has caught the pointer up, and through a
      // scroll so the glow resumes once it settles
      if (scrolling || Math.abs(px - gx) > 0.5 || Math.abs(py - gy) > 0.5) {
        raf = requestAnimationFrame(frame);
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      target = e.target as Element | null;
      if (!active) {
        active = true;
        gx = px;
        gy = py;
        glow?.classList.add('on');
      }
      schedule();
    };

    // content scrolls under a still pointer; what it is over has changed
    const onScroll = () => {
      lastScroll = performance.now();
      if (!active) return;
      retarget = true;
      schedule();
    };

    const onLeave = () => {
      active = false;
      release(tilted);
      release(magnet);
      tilted = null;
      magnet = null;
      glow?.classList.remove('on');
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const surface = (e.target as Element | null)?.closest<HTMLElement>('.glass');
      if (!surface) return;
      const r = surface.getBoundingClientRect();
      const wrap = document.createElement('span');
      wrap.className = 'g-ripple-wrap';
      const dot = document.createElement('span');
      dot.className = 'g-ripple';
      dot.style.left = `${e.clientX - r.left}px`;
      dot.style.top = `${e.clientY - r.top}px`;
      // big enough to cross the whole surface from wherever it started
      dot.style.setProperty('--rs', String(Math.ceil((Math.hypot(r.width, r.height) * 2) / 20)));
      wrap.appendChild(dot);
      surface.appendChild(wrap);
      // removed when the animation ends, with a timer behind it: where CSS
      // animations do not run, animationend never fires and ripples would
      // otherwise pile up inside the panel with every click
      const remove = () => wrap.remove();
      dot.addEventListener('animationend', remove, { once: true });
      window.setTimeout(remove, 1200);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      onLeave();
      for (const el of [backdrop, hero]) {
        el?.style.removeProperty('--cx');
        el?.style.removeProperty('--cy');
      }
    };
  }, [enabled]);
}
