import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'glass-motion';

function systemPrefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readStored(): 'on' | 'off' | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    // storage blocked (private mode, strict settings): fall back to the system
    return null;
  }
}

/**
 * Whether the page animates, with a switch the reader controls.
 *
 * It starts from the operating system's reduced-motion preference, and the
 * nav has a visible toggle that overrides it either way and is remembered.
 * The override matters: someone with reduced motion switched on system-wide
 * can still want to see this page move, and without a switch the cursor, the
 * drift and the reveals would simply never exist for them.
 *
 * The answer is written to <html data-motion>, which is the only thing the
 * stylesheet keys motion off. Nothing is hidden unless it is "on".
 */
export function useMotion(): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    const stored = readStored();
    return stored ? stored === 'on' : !systemPrefersReduced();
  });

  useEffect(() => {
    document.documentElement.dataset.motion = on ? 'on' : 'off';
  }, [on]);

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? 'on' : 'off');
      } catch {
        // not remembered across visits, but the switch still works now
      }
      return next;
    });
  }, []);

  return [on, toggle];
}

/**
 * Adds .in to every .reveal element as it scrolls into view.
 *
 * `version` lets a caller ask for a rescan after new .reveal elements mount,
 * such as project cards that arrive with the GitHub data.
 */
export function useReveal(version: unknown = 0) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.in)'));
    if (els.length === 0) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [version]);
}

/** A stat value split into the part that counts and the text around it. */
function parseStat(value: string): { n: number; format: (x: number) => string } | null {
  const m = /^([\d,]+(?:\.\d+)?)([A-Za-z]*)(\+?)$/.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const commas = m[1].includes(',');
  const suffix = m[2] + m[3];
  return {
    n,
    format: (x) => (commas ? Math.round(x).toLocaleString('en-US') : String(Math.round(x))) + suffix,
  };
}

/**
 * Counts a stat up from zero when it scrolls into view, then settles on the
 * exact original string, so "1,500+" ends as "1,500+" and not "1500+".
 * With motion off, or for a value it cannot parse, it shows the value as is.
 */
export function useCountUp(value: string, motion: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    const stat = parseStat(value);
    if (!motion || !el || !stat || !('IntersectionObserver' in window)) {
      setShown(value);
      return;
    }
    setShown(stat.format(0));
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1400;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          if (t < 1) {
            setShown(stat.format(stat.n * eased));
            raf = requestAnimationFrame(step);
          } else {
            setShown(value);
          }
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, motion]);

  return { ref, shown };
}
