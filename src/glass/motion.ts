import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const KEY = 'glass-motion';

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
 * On by default, including for readers whose system asks for reduced motion:
 * that was a deliberate call by the site's owner, because with the system
 * preference in charge the animation simply never ran for him or anyone set
 * up like him. The Motion switch in the nav turns it off for anyone who
 * prefers it still, and that choice is remembered.
 *
 * The answer is written to <html data-motion>, which is the only thing the
 * stylesheet keys motion off. Nothing is hidden unless it is "on".
 */
export function useMotion(): [boolean, () => void] {
  const [on, setOn] = useState(() => readStored() !== 'off');

  // A layout effect, so the attribute is in place before the first paint.
  // Set after it, the hero painted visible, was then hidden by the reveal
  // rule, and faded back in: a flash on every load.
  useLayoutEffect(() => {
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
  const base = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const letter = m[2].toUpperCase();
  const plus = m[3];
  // count in the value's own case, so '5k+' does not count in 'K' and then
  // switch to 'k' on the final frame
  const lower = m[2] !== '' && m[2] === m[2].toLowerCase();
  const [k, mil] = lower ? ['k', 'm'] : ['K', 'M'];

  // "1M+" counted as 0 to 1 is a single jump, not a count, so thousands and
  // millions count through their real size instead: 0K+, 500K+, then 1M+
  const unit = letter === 'M' ? 1e6 : letter === 'K' ? 1e3 : 1;
  if (unit > 1) {
    return {
      n: base * unit,
      format: (x) => (x >= 1e6 ? `${Math.floor(x / 1e6)}${mil}` : `${Math.floor(x / 1e3)}${k}`) + plus,
    };
  }
  const commas = m[1].includes(',');
  const suffix = m[2] + plus;
  return {
    n: base,
    format: (x) => (commas ? Math.round(x).toLocaleString('en-US') : String(Math.round(x))) + suffix,
  };
}

/**
 * Counts a stat up from zero every time it scrolls into view, and settles on
 * the exact original string, so "1,500+" ends as "1,500+" and not "1500+".
 *
 * The real value is the resting state. It only drops to zero at the moment
 * the stat comes into view (the same moment its panel starts fading in, so
 * the final number never flashes first), and returns to the real value when
 * it leaves. Parking it at zero instead meant that anywhere animation frames
 * do not run, a background tab or a search engine rendering the page, the
 * stats read "0M+". A timer also guarantees each count lands on the real
 * value even if frames stop partway.
 */
export function useCountUp(value: string, motion: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  // the number mid-count, or null when resting on the real value
  const [counting, setCounting] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    const stat = parseStat(value);
    if (!motion || !el || !stat || !('IntersectionObserver' in window)) return;

    const dur = 1400;
    let raf = 0;
    let settle = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
    const run = () => {
      stop();
      setCounting(stat.format(0));
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        if (t < 1) {
          setCounting(stat.format(stat.n * (1 - Math.pow(1 - t, 3))));
          raf = requestAnimationFrame(step);
        } else {
          setCounting(null);
        }
      };
      raf = requestAnimationFrame(step);
      settle = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        setCounting(null);
      }, dur + 250);
    };
    // Re-armed only once the stat is completely off screen. Without that,
    // small scrolls around the observer's edge fired enter, leave, enter,
    // and each one dropped the figure back to zero and started again.
    let armed = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (armed) {
            armed = false;
            run();
          }
          return;
        }
        const r = entry.boundingClientRect;
        if (r.bottom <= 0 || r.top >= window.innerHeight) {
          armed = true;
          stop();
          setCounting(null);
        }
      },
      // matches useReveal, so the count starts as the panel begins to appear
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
      // a count cut off by a motion toggle must not reappear half-finished
      setCounting(null);
    };
  }, [value, motion]);

  return { ref, shown: motion && counting !== null ? counting : value };
}
