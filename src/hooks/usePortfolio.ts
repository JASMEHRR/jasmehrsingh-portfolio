import data from '../data/portfolio.json';
import type { Portfolio } from '../types/portfolio';

export const OVERRIDE_KEY = 'portfolio-override';

/** Parsed once per page load rather than on every render. */
let cached: Portfolio | null = null;

function read(): Portfolio {
  const base = data as unknown as Portfolio;
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) as Partial<Portfolio>) };
  } catch {
    // private mode, blocked storage, or malformed JSON — fall back to the file
    return base;
  }
}

/**
 * Typed access to the content layer.
 *
 * Components must never hardcode profile, experience, project or stat copy —
 * everything comes through here so a design pivot only touches JSON.
 *
 * /edit writes a draft into localStorage; if one is present it is layered over
 * the committed file so edits preview immediately without a rebuild. Exporting
 * from the editor and replacing src/data/portfolio.json is what makes a change
 * permanent and visible to everyone else.
 */
export function usePortfolio(): Portfolio {
  if (!cached) cached = read();
  return cached;
}

/** Save a draft and reload so every component picks it up. */
export function saveOverride(next: Portfolio) {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
  cached = null;
}

/** Drop the draft and go back to the committed file. */
export function clearOverride() {
  localStorage.removeItem(OVERRIDE_KEY);
  cached = null;
}

/** The committed file, ignoring any draft. */
export function basePortfolio(): Portfolio {
  return data as unknown as Portfolio;
}
