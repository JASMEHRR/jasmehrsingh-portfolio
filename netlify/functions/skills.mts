import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
import portfolio from '../../src/data/portfolio.json' with { type: 'json' };

/**
 * Skill levels edited from the live site: the hidden editor in
 * src/glass/Skills.tsx, and src/glass/skillEdits.ts on the client.
 *
 *   GET   the stored levels, for every visitor
 *   POST  { password }           checks the password, returns the stored levels
 *   POST  { password, levels }   replaces the stored levels
 *
 * The password is EDIT_PASSWORD in the site's Netlify environment variables,
 * and must be at least MIN_PASSWORD characters. With none set, or a shorter
 * one, every password is wrong and nothing can be saved. Levels live in a
 * Netlify Blobs store, so a change is live without a rebuild.
 */

const STORE = 'portfolio-edits';
const KEY = 'skill-levels';

// Guessing is slowed by a second per wrong try, but guesses can be sent in
// parallel, so the real defence is a password too long to guess. A short one
// is refused outright rather than trusted.
const MIN_PASSWORD = 12;

// the skills the site actually has; a save can set levels for these only
const NAMES = new Set(portfolio.skills.categories.flatMap((c) => c.items.map((s) => s.name)));

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

/** The well-formed entries of `v`, and whether anything else was in it. */
function readLevels(v: unknown): { levels: Record<string, number>; rejected: boolean } {
  const levels: Record<string, number> = {};
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return { levels, rejected: true };
  let rejected = false;
  for (const [name, level] of Object.entries(v)) {
    if (NAMES.has(name) && typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 5) {
      levels[name] = level;
    } else {
      rejected = true;
    }
  }
  return { levels, rejected };
}

/**
 * Filtered on the way out as well, so a skill since renamed or removed in
 * portfolio.json simply drops its old edit.
 */
async function storedLevels(consistency: 'eventual' | 'strong'): Promise<Record<string, number>> {
  const stored = await getStore({ name: STORE, consistency }).get(KEY, { type: 'json' });
  return stored ? readLevels(stored).levels : {};
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'GET') {
    // visitors read through the edge cache: an edit reaching them up to a
    // minute late is fine, and it keeps this cheap on every page view
    return json({ levels: await storedLevels('eventual') });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const text = await req.text();
  if (text.length > 10_000) return json({ error: 'Too large' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Not JSON' }, 400);
  }
  if (typeof body !== 'object' || body === null) return json({ error: 'Not an object' }, 400);
  const { password, levels } = body as { password?: unknown; levels?: unknown };

  if (!passwordOk(password)) {
    // a second's wait makes guessing one password after another slow
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return json({ error: 'Wrong password' }, 401);
  }
  // unlocking hands the editor the stored levels as they are right now, so it
  // never starts from a stale or missing copy and saves over edits it did
  // not know about
  if (levels === undefined) return json({ ok: true, levels: await storedLevels('strong') });

  const read = readLevels(levels);
  if (read.rejected) return json({ error: 'Levels must be whole numbers from 1 to 5, for skills the site has' }, 400);
  await getStore({ name: STORE, consistency: 'strong' }).setJSON(KEY, read.levels);
  return json({ ok: true, levels: read.levels });
};
