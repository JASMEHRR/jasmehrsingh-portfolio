import { useEffect, useState } from 'react';
import type { Portfolio } from '../types/portfolio';

/**
 * Content edited on the live site.
 *
 * portfolio.json is what the site ships with. Sections edited through the
 * hidden editor (EditMode.tsx) are stored by a Netlify function,
 * netlify/functions/content.mts, and layered over the file for every
 * visitor, so wording can change without a rebuild.
 *
 * A section is a whole top level part of the file: edit the projects and the
 * stored copy of projects is what everyone sees, while the sections never
 * edited keep following the file. Publishing needs the password set as
 * EDIT_PASSWORD in the site's Netlify environment; it is held in memory for
 * the visit and never stored.
 */

export const CONTENT_ENDPOINT = '/.netlify/functions/content';

export const SECTIONS = ['profile', 'skills', 'experience', 'projects', 'education', 'services', 'game'] as const;
export type Section = (typeof SECTIONS)[number];

/** Sections as they are stored: a whole section each, or null to drop one. */
export type Overrides = Partial<Record<Section, unknown>>;

export function merge(base: Portfolio, overrides: Overrides): Portfolio {
  return { ...base, ...(overrides as Partial<Portfolio>) };
}

/**
 * Whether `v` is built like `template`: the same types, and no keys the file
 * does not have.
 *
 * The function checks this too, and it is the one that decides what may be
 * stored. This is the page defending itself: everything here is drawn
 * straight into the site, so an answer that is not the shape the components
 * expect would take the page down rather than show old content.
 */
const URL_KEYS = new Set(['link', 'url', 'website', 'github', 'linkedin', 'instagram', 'image', 'icon', 'avatarSvg']);

/** Only ordinary web addresses go into an href or a src; see the same list in the function. */
function urlOk(v: string): boolean {
  if (v === '' || v.startsWith('/')) return true;
  try {
    const { protocol } = new URL(v);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function looksLike(v: unknown, template: unknown, key = ''): boolean {
  if (typeof template === 'string') {
    return typeof v === 'string' && (!URL_KEYS.has(key) || urlOk(v));
  }
  if (typeof template === 'number') return typeof v === 'number' && Number.isFinite(v);
  if (typeof template === 'boolean') return typeof v === 'boolean';
  if (Array.isArray(template)) {
    if (!Array.isArray(v)) return false;
    const item = template[0];
    return item === undefined || v.every((x) => looksLike(x, item, key));
  }
  if (template && typeof template === 'object') {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
    const t = template as Record<string, unknown>;
    // hasOwn, not `in`: an inherited name is not a field of the file's own
    return Object.entries(v).every(([k, val]) => Object.hasOwn(t, k) && looksLike(val, t[k], k));
  }
  return false;
}

function readOverrides(v: unknown, base: Portfolio): Overrides {
  const out: Overrides = {};
  if (typeof v !== 'object' || v === null) return out;
  const file = base as unknown as Record<string, unknown>;
  for (const [k, value] of Object.entries(v)) {
    if (!(SECTIONS as readonly string[]).includes(k) || value === null || value === undefined) continue;
    if (looksLike(value, file[k], k)) out[k as Section] = value;
  }
  return out;
}

/**
 * The stored sections, empty until they arrive. Also empty wherever the
 * function does not exist, such as under `vite dev`, where the file stands.
 */
export function useLiveContent(base: Portfolio): [Overrides, (o: Overrides) => void] {
  const [overrides, setOverrides] = useState<Overrides>({});
  useEffect(() => {
    let alive = true;
    fetch(CONTENT_ENDPOINT, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        const content = (d as { content?: unknown } | null)?.content;
        if (alive && content) setOverrides(readOverrides(content, base));
      })
      .catch(() => {
        // offline, blocked, or no function here: the file's content stands
      });
    return () => {
      alive = false;
    };
  }, [base]);
  return [overrides, setOverrides];
}

export type SendResult =
  | { result: 'ok'; content: Overrides }
  | { result: 'wrong-password' }
  | { result: 'failed'; error?: string };

async function send(base: Portfolio, body: { password: string; sections?: Overrides }): Promise<SendResult> {
  try {
    const r = await fetch(CONTENT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.status === 401) return { result: 'wrong-password' };
    // the function's own answer, not merely a 200: a page served in its
    // place would otherwise let any password in and report every save done
    const d = (await r.json().catch(() => null)) as { ok?: unknown; content?: unknown; error?: unknown } | null;
    if (!r.ok || d?.ok !== true || typeof d.content !== 'object' || d.content === null) {
      return { result: 'failed', error: typeof d?.error === 'string' ? d.error : undefined };
    }
    return { result: 'ok', content: readOverrides(d.content, base) };
  } catch {
    return { result: 'failed' };
  }
}

/** Checks the password without changing anything, and returns the stored sections. */
export function unlock(base: Portfolio, password: string): Promise<SendResult> {
  return send(base, { password });
}

/** Stores these sections for everyone. A null value puts that section back to the file. */
export function publish(base: Portfolio, password: string, sections: Overrides): Promise<SendResult> {
  return send(base, { password, sections });
}
