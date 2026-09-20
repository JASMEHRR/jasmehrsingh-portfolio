import data from '../data/portfolio.json';
import type { Portfolio } from '../types/portfolio';

/**
 * Typed access to the content layer.
 *
 * Components must never hardcode profile, experience, project or stat copy:
 * everything comes through here, so a design pivot only touches JSON.
 *
 * This is the committed file and nothing else. What a visitor reads can
 * differ: the glass site lays the sections edited on the live site over this
 * (src/glass/liveContent.ts) and hands the result to the page. There used to
 * be a third layer as well, a draft in localStorage written by an editor at
 * /edit. It went: it only ever changed the one browser it was typed in, while
 * the editor that publishes reads this merge, so those private drafts could
 * have gone out to everyone without a word.
 */
export function usePortfolio(): Portfolio {
  return data as unknown as Portfolio;
}
