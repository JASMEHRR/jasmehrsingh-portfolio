import { useEffect } from 'react';

export type Biome = 'overworld' | 'enchant' | 'craft' | 'cave' | 'cherry' | 'night';

/**
 * Drives the world backdrop from whichever section is on screen.
 *
 * Every section carries data-biome; the observer copies the winner onto
 * <html>, and index.css transitions the sky and every layer's opacity from
 * there. Scrolling therefore walks you through the world instead of past a
 * static picture.
 *
 * The winner is the entry closest to the middle of the viewport rather than
 * simply the first intersecting one, otherwise two adjacent sections fight
 * over the backdrop while both are partly visible.
 */
export function useBiome() {
  useEffect(() => {
    // scoped to <section>: the winner is written onto <html>, which would
    // otherwise match this query and compete with the real sections
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('section[data-biome]'),
    );
    if (sections.length === 0) return;

    const apply = () => {
      const middle = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bestDistance = Infinity;

      for (const section of sections) {
        const { top, bottom } = section.getBoundingClientRect();
        if (bottom < 0 || top > window.innerHeight) continue;
        const centre = (top + bottom) / 2;
        const distance = Math.abs(centre - middle);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = section;
        }
      }

      const biome = best?.dataset.biome;
      if (biome && document.documentElement.dataset.biome !== biome) {
        document.documentElement.dataset.biome = biome;
      }
    };

    apply();
    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);
}
