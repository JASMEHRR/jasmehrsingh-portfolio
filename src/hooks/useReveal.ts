import { useEffect } from 'react';

/**
 * Scroll-triggered reveals, as progressive enhancement.
 *
 * Elements marked data-reveal start fully visible in the stylesheet. Only if
 * motion is welcome does this hook add the .reveal class that hides them,
 * then .in as each scrolls into view. So if JS never runs, or the reader
 * prefers reduced motion, the page is simply there — the failure mode is
 * "no animation", never "no content".
 */
export function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;

    targets.forEach((el) => el.classList.add('reveal'));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.reveal) || 0;
          window.setTimeout(() => el.classList.add('in'), delay);
          io.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
