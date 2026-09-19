import data from '../data/portfolio.json';
import type { Portfolio } from '../types/portfolio';

export const OVERRIDE_KEY = 'portfolio-override';

/** Parsed once per page load rather than on every render. */
let cached: Portfolio | null = null;

/**
 * Drop fields the site has retired, if an old draft still carries them.
 *
 * Location was removed from the site on purpose: no city on a professional
 * page. A draft saved in /edit before that still holds profile.location,
 * game.spawn and a location on every job and degree, and because /edit seeds
 * itself from this merge, downloading from it would have written the city
 * straight back into portfolio.json. Removing them here covers rendering,
 * editing and downloading in one place.
 */
function scrub(p: Portfolio): Portfolio {
  const drop = <T extends object>(o: T, key: string): T => {
    const { [key]: _gone, ...rest } = o as Record<string, unknown>;
    return rest as T;
  };
  return {
    ...p,
    profile: drop(p.profile, 'location'),
    game: drop(p.game, 'spawn'),
    experience: p.experience.map((e) => drop(e, 'location')),
    education: p.education.map((e) => drop(e, 'location')),
  };
}

function read(): Portfolio {
  const base = data as unknown as Portfolio;
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return base;
    const over = JSON.parse(raw) as Partial<Portfolio>;

    // `game` is merged a level deeper than everything else. The draft holds a
    // whole Portfolio, so a plain spread lets an old draft's `game` replace the
    // file's outright - and every field added to game after that draft was
    // saved then reads as undefined. That is not hypothetical: adding
    // game.guide did exactly this, and a component reading game.guide[biome]
    // took the whole page down with it. Layering game over the file's copy
    // means new fields keep their committed values until the draft has an
    // opinion about them.
    return scrub({ ...base, ...over, game: { ...base.game, ...(over.game ?? {}) } });
  } catch {
    // private mode, blocked storage, or malformed JSON, fall back to the file
    return base;
  }
}

/**
 * Typed access to the content layer.
 *
 * Components must never hardcode profile, experience, project or stat copy -
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
