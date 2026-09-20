import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
import portfolio from '../../src/data/portfolio.json' with { type: 'json' };

/**
 * The content edited from the live site: the section editor in
 * src/glass/EditMode.tsx, and src/glass/liveContent.ts on the client.
 *
 *   GET   the stored sections, for every visitor
 *   POST  { password }             checks the password, returns the stored sections
 *   POST  { password, sections }   stores those sections; a null value drops one
 *
 * A section is a top level part of portfolio.json (profile, projects,
 * experience and so on). Editing one stores the whole of it, and the parts
 * never edited keep following the committed file. Whatever is stored has to
 * have the same shape as the file's own copy, so a saved section can only
 * ever be the site's own content with different words in it.
 *
 * The password is EDIT_PASSWORD in the site's Netlify environment variables,
 * and must be at least MIN_PASSWORD characters. With none set, or a shorter
 * one, every password is wrong and nothing can be saved.
 */

const STORE = 'portfolio-edits';
const KEY = 'content';

// Guessing is slowed by a second per wrong try, but guesses can be sent in
// parallel, so the real defence is a password too long to guess. A short one
// is refused outright rather than trusted.
const MIN_PASSWORD = 12;

const SECTIONS = ['profile', 'skills', 'experience', 'projects', 'education', 'services', 'game'] as const;
type Section = (typeof SECTIONS)[number];

const MAX_BODY = 200_000;
const MAX_STRING = 4000;
const MAX_ITEMS = 60;

type Json = Record<string, unknown>;

const FILE = portfolio as unknown as Json;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function passwordOk(given: unknown): boolean {
  const real = process.env.EDIT_PASSWORD;
  if (!real || real.length < MIN_PASSWORD || typeof given !== 'string') return false;
  // hashed first, so both sides are the same length and the comparison takes
  // the same time however much of a guess is right
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(given), digest(real));
}

/**
 * One shape standing for everything in `list`.
 *
 * A list's items do not all carry the same keys: one project has a link and
 * another has none. Merging them means an edited or added item may use any
 * key that any item in the file uses, and nothing else.
 */
function unionShape(list: unknown[]): unknown {
  return list.reduce((a, b) => mergeShape(a, b), undefined as unknown);
}

function mergeShape(a: unknown, b: unknown): unknown {
  if (a === undefined || a === null) return b;
  if (b === undefined || b === null) return a;
  if (Array.isArray(a) && Array.isArray(b)) {
    const items = [...a, ...b];
    return items.length > 0 ? [unionShape(items)] : [];
  }
  if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const merged: Json = { ...(a as Json) };
    for (const [k, v] of Object.entries(b as Json)) merged[k] = mergeShape(merged[k], v);
    return merged;
  }
  return a;
}

/**
 * Fields the page puts into an href or a src, and what may be in them.
 *
 * A link is the one kind of text that the browser executes. Left to the type
 * check alone, "javascript:..." saved into a project link would run for every
 * visitor who clicked the card, on this site's own domain, without any commit
 * to show for it. Only the ordinary web addresses are allowed: nothing, a
 * path within the site, or http(s).
 */
const URL_KEYS = new Set(['link', 'url', 'website', 'github', 'linkedin', 'instagram', 'image', 'icon', 'avatarSvg']);

function urlOk(v: string): boolean {
  if (v === '' || v.startsWith('/')) return true;
  try {
    const { protocol } = new URL(v);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Whether `v` is the same shape as `template`: same types, no keys the file does not have. */
function sameShape(v: unknown, template: unknown, key = ''): boolean {
  if (template === null || template === undefined) return v === null || typeof v === 'string';
  if (typeof template === 'string') {
    if (typeof v !== 'string' || v.length > MAX_STRING) return false;
    return !URL_KEYS.has(key) || urlOk(v);
  }
  if (typeof template === 'number') return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e9;
  if (typeof template === 'boolean') return typeof v === 'boolean';
  if (Array.isArray(template)) {
    if (!Array.isArray(v) || v.length > MAX_ITEMS) return false;
    if (template.length === 0) return v.length === 0;
    const item = unionShape(template);
    return v.every((x) => sameShape(x, item, key));
  }
  if (typeof template === 'object') {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
    const t = template as Json;
    // hasOwn, not `in`: an inherited name is not a field of the file's own
    return Object.entries(v as Json).every(([k, val]) => Object.hasOwn(t, k) && sameShape(val, t[k], k));
  }
  return false;
}

/**
 * A skill's level is drawn as five blocks and nothing else, so anything
 * outside one to five has no meaning on the page. The shape check cannot say
 * this on its own, because other numbers in the file (the game's own level)
 * are free to be anything.
 */
function skillLevelsOk(value: unknown): boolean {
  const categories = (value as { categories?: unknown })?.categories;
  if (!Array.isArray(categories)) return false;
  return categories.every((c) => {
    const items = (c as { items?: unknown })?.items;
    return (
      Array.isArray(items) &&
      items.every((s) => {
        const level = (s as { level?: unknown })?.level;
        return Number.isInteger(level) && (level as number) >= 1 && (level as number) <= 5;
      })
    );
  });
}

function isSection(s: string): s is Section {
  return (SECTIONS as readonly string[]).includes(s);
}

/** The stored sections, dropping anything that no longer fits the file's shape. */
async function stored(consistency: 'eventual' | 'strong'): Promise<Json> {
  const saved = await getStore({ name: STORE, consistency }).get(KEY, { type: 'json' });
  const out: Json = {};
  if (typeof saved !== 'object' || saved === null) return out;
  for (const [section, value] of Object.entries(saved as Json)) {
    if (isSection(section) && sameShape(value, FILE[section], section)) out[section] = value;
  }
  return out;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'GET') {
    // visitors read through the edge cache: an edit reaching them up to a
    // minute late is fine, and it keeps this cheap on every page view
    return json({ content: await stored('eventual') });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const text = await req.text();
  if (text.length > MAX_BODY) return json({ error: 'Too large' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Not JSON' }, 400);
  }
  if (typeof body !== 'object' || body === null) return json({ error: 'Not an object' }, 400);
  const { password, sections } = body as { password?: unknown; sections?: unknown };

  if (!passwordOk(password)) {
    // a second's wait makes guessing one password after another slow
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return json({ error: 'Wrong password' }, 401);
  }

  // unlocking hands the editor the stored sections as they are right now, so
  // it never starts from a stale or missing copy and publishes over edits it
  // did not know about
  if (sections === undefined) return json({ ok: true, content: await stored('strong') });

  if (typeof sections !== 'object' || sections === null || Array.isArray(sections)) {
    return json({ error: 'Sections must be an object' }, 400);
  }
  const incoming = Object.entries(sections as Json);
  for (const [section, value] of incoming) {
    if (!isSection(section)) return json({ error: `Not a section of this site: ${section}` }, 400);
    // null puts a section back to the committed file
    if (value === null) continue;
    if (!sameShape(value, FILE[section], section)) {
      return json(
        {
          error: `The ${section} section does not fit this site: check that every link is an ordinary web address`,
        },
        400,
      );
    }
    if (section === 'skills' && !skillLevelsOk(value)) {
      return json({ error: 'Every skill level has to be a whole number from 1 to 5' }, 400);
    }
  }

  const next = await stored('strong');
  for (const [section, value] of incoming) {
    if (value === null) delete next[section];
    else next[section] = value;
  }
  await getStore({ name: STORE, consistency: 'strong' }).setJSON(KEY, next);
  return json({ ok: true, content: next });
};
