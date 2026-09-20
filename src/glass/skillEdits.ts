import { useEffect, useState } from 'react';
import type { SkillCategory } from '../types/portfolio';

/**
 * Skill levels edited on the live site.
 *
 * portfolio.json holds the levels the site ships with. Edits made through the
 * hidden editor (Skills.tsx) are stored by a Netlify function,
 * netlify/functions/skills.mts, and layered over the file for every visitor,
 * so a level can change without a rebuild. Only levels that differ from the
 * file are stored, keyed by skill name.
 *
 * Saving needs the password set as EDIT_PASSWORD in the site's Netlify
 * environment. It is held in memory for the visit and never stored.
 */

export const SKILLS_ENDPOINT = '/.netlify/functions/skills';

export type Levels = Record<string, number>;

export function validLevel(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
}

/** The categories with any stored level laid over the file's. */
export function applyLevels(categories: SkillCategory[], levels: Levels | null): SkillCategory[] {
  if (!levels) return categories;
  return categories.map((c) => ({
    ...c,
    items: c.items.map((s) => {
      const level = levels[s.name];
      return validLevel(level) ? { ...s, level } : s;
    }),
  }));
}

/**
 * The stored levels, or null until they arrive. Also null wherever the
 * function does not exist, such as under `vite dev`, where the file's levels
 * simply stand.
 */
export function useLiveLevels(): [Levels | null, (levels: Levels) => void] {
  const [levels, setLevels] = useState<Levels | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(SKILLS_ENDPOINT, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        const l = (d as { levels?: unknown } | null)?.levels;
        if (alive && typeof l === 'object' && l !== null) setLevels(l as Levels);
      })
      .catch(() => {
        // offline, blocked, or no function here: the file's levels stand
      });
    return () => {
      alive = false;
    };
  }, []);
  return [levels, setLevels];
}

export type SendResult =
  | { result: 'ok'; levels: Levels }
  | { result: 'wrong-password' }
  | { result: 'failed' };

async function send(body: { password: string; levels?: Levels }): Promise<SendResult> {
  try {
    const r = await fetch(SKILLS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.status === 401) return { result: 'wrong-password' };
    // the function's own answer, not merely a 200: a page served in its
    // place would otherwise let any password in and report every save done
    const d = (await r.json().catch(() => null)) as { ok?: unknown; levels?: unknown } | null;
    if (!r.ok || d?.ok !== true || typeof d.levels !== 'object' || d.levels === null) return { result: 'failed' };
    return { result: 'ok', levels: d.levels as Levels };
  } catch {
    return { result: 'failed' };
  }
}

/** Checks the password without changing anything, and returns the stored levels. */
export function unlock(password: string): Promise<SendResult> {
  return send({ password });
}

/** Replaces the stored levels with `levels`, the ones that differ from the file. */
export function saveLevels(password: string, levels: Levels): Promise<SendResult> {
  return send({ password, levels });
}
