import data from '../data/portfolio.json';
import type { Portfolio } from '../types/portfolio';

/**
 * Typed access to the content layer.
 * Components must never hardcode profile, experience, project or testimonial
 * copy — everything comes through here so a design pivot only touches JSON.
 */
export function usePortfolio(): Portfolio {
  return data as Portfolio;
}
