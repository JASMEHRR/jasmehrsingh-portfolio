import { createContext, useContext } from 'react';
import type { Section } from './liveContent';

/**
 * What the editor is, apart from the parts that draw it: which pencil opens
 * which part of the content, and the handle a component uses to ask whether
 * the site is being edited. Kept out of EditMode.tsx so that file exports
 * components only, which is what hot reloading needs.
 */

export type CardName =
  | 'intro'
  | 'numbers'
  | 'about'
  | 'projects'
  | 'experience'
  | 'skills'
  | 'education'
  | 'contact';

interface Card {
  title: string;
  parts: { section: Section; keys?: string[] }[];
}

/** Each pencil on the page, and the part of the content it opens. */
export const CARDS: Record<CardName, Card> = {
  intro: {
    title: 'Intro',
    parts: [
      { section: 'profile', keys: ['name', 'shortName', 'tagline', 'role', 'specialization'] },
      { section: 'game', keys: ['openTo'] },
    ],
  },
  numbers: { title: 'Numbers', parts: [{ section: 'game', keys: ['ores'] }] },
  about: {
    title: 'About and services',
    parts: [{ section: 'profile', keys: ['bio'] }, { section: 'services' }],
  },
  projects: { title: 'Projects', parts: [{ section: 'projects' }] },
  experience: { title: 'Experience', parts: [{ section: 'experience' }] },
  skills: { title: 'Skills', parts: [{ section: 'skills' }] },
  education: { title: 'Education', parts: [{ section: 'education' }] },
  contact: { title: 'Contact details', parts: [{ section: 'profile', keys: ['social'] }] },
};

export type Json = Record<string, unknown>;

// fields the page never shows: an internal id, the avatar file, an image path
export const HIDDEN = new Set(['id', 'avatarSvg', 'image', 'rarity', 'material', 'icon']);
// what a new item keeps from the one above it rather than starting empty
export const KEPT = new Set(['id', 'image', 'color', 'rarity', 'material', 'icon']);
export const LONG = new Set(['bio', 'description', 'summary', 'body', 'status', 'className']);
export const NAMED: Record<string, string> = { github: 'GitHub', linkedin: 'LinkedIn', url: 'URL', openTo: 'Open to' };

export function label(key: string): string {
  if (NAMED[key]) return NAMED[key];
  const words = key.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function clone<T>(v: T): T {
  return structuredClone(v);
}

export function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The title-ish fields; an item with none of them filled in has nothing to show. */
export const TITLE_KEYS = ['title', 'name', 'role', 'company', 'degree', 'institution', 'label'];

// enough to tell apart two items added in the same millisecond
let added = 0;

/** A new list item shaped like the one above it: the words cleared, the settings kept. */
export function blankLike(sample: unknown): unknown {
  if (Array.isArray(sample)) return [];
  if (sample && typeof sample === 'object') {
    const out: Json = {};
    for (const [k, v] of Object.entries(sample as Json)) {
      if (k === 'id') out[k] = `item-${Date.now().toString(36)}-${++added}`;
      else if (KEPT.has(k)) out[k] = v;
      else out[k] = blankLike(v);
    }
    return out;
  }
  if (typeof sample === 'number') return 0;
  if (typeof sample === 'boolean') return false;
  return '';
}

export function titleOf(item: unknown, index: number): string {
  if (item && typeof item === 'object') {
    for (const k of TITLE_KEYS) {
      const v = (item as Json)[k];
      if (typeof v === 'string' && v.trim() !== '') return v;
    }
  }
  return `Item ${index + 1}`;
}

/** The name of a section holding an item with nothing in any of its title fields. */
export function blankItemIn(sections: Record<string, unknown>): string | null {
  for (const [section, value] of Object.entries(sections)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item || typeof item !== 'object') return section;
      const named = TITLE_KEYS.some((k) => {
        const v = (item as Json)[k];
        return typeof v === 'string' && v.trim() !== '';
      });
      if (!named) return section;
    }
  }
  return null;
}

export interface EditApi {
  editing: boolean;
  /** A new identity whenever the content changes, for the hooks that rescan the page. */
  revision: unknown;
  start: () => void;
  openCard: (card: CardName) => void;
  /** The whole of one section as it now reads, edits included. */
  section: (name: Section) => unknown;
  setSection: (name: Section, value: unknown) => void;
}

export const Ctx = createContext<EditApi | null>(null);

export function useEdit(): EditApi | null {
  return useContext(Ctx);
}
