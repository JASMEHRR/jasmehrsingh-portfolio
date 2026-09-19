import { useEffect, useState } from 'react';

/**
 * Live data from GitHub's public REST API, read in the visitor's browser.
 *
 * No token is involved, so every visitor is limited to 60 requests an hour
 * by IP. A page view costs two (repos and recent events), and the result is
 * cached in sessionStorage for ten minutes, so ordinary browsing never gets
 * near the limit. If GitHub is down, rate-limited or blocked, this resolves
 * to null and the page falls back to the curated projects in portfolio.json;
 * nothing on the page depends on GitHub answering.
 *
 * What GitHub no longer provides, so this does not pretend to: the public
 * events feed stopped carrying commit messages and pull-request titles, so
 * activity is reported as what happened, where and when.
 */

export const GITHUB_USER = 'JASMEHRR';
const CACHE_KEY = 'gh-cache-v1';
const CACHE_MS = 10 * 60 * 1000;

export interface Repo {
  name: string;
  url: string;
  description: string;
  language: string | null;
  stars: number;
  pushedAt: string;
  fork: boolean;
}

export interface Activity {
  type: string;
  action: string;
  repo: string;
  at: string;
}

export interface GitHubData {
  repos: Repo[];
  activity: Activity[];
  fetchedAt: number;
}

/**
 * No em or en dashes in anything shown on the site, including text GitHub
 * supplies, such as a repository description.
 */
export function undash(s: string): string {
  return s
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, '$1 to $2')
    .replace(/\s+[\u2013\u2014]\s+/g, ', ')
    .replace(/[\u2013\u2014]/g, '-');
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${url}`);
  return res.json();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toRepo(r: unknown): Repo | null {
  if (!isRecord(r) || typeof r.name !== 'string' || typeof r.html_url !== 'string') return null;
  return {
    name: r.name,
    url: r.html_url,
    description: typeof r.description === 'string' ? undash(r.description) : '',
    language: typeof r.language === 'string' ? r.language : null,
    stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : 0,
    pushedAt: typeof r.pushed_at === 'string' ? r.pushed_at : '',
    fork: r.fork === true,
  };
}

function toActivity(e: unknown): Activity | null {
  if (!isRecord(e) || typeof e.type !== 'string' || typeof e.created_at !== 'string') return null;
  const repo = isRecord(e.repo) && typeof e.repo.name === 'string' ? e.repo.name.split('/').pop() ?? '' : '';
  const payload = isRecord(e.payload) ? e.payload : {};
  const action =
    typeof payload.action === 'string'
      ? payload.action
      : typeof payload.ref_type === 'string'
        ? payload.ref_type
        : '';
  return { type: e.type, action, repo, at: e.created_at };
}

function readCache(): GitHubData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GitHubData;
    if (!Array.isArray(data.repos) || Date.now() - data.fetchedAt > CACHE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: GitHubData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // storage full or blocked: the next view simply fetches again
  }
}

export async function loadGitHub(): Promise<GitHubData | null> {
  const cached = readCache();
  if (cached) return cached;

  const base = `https://api.github.com/users/${GITHUB_USER}`;
  const [reposRes, eventsRes] = await Promise.allSettled([
    getJson(`${base}/repos?per_page=100&sort=pushed`),
    getJson(`${base}/events/public?per_page=100`),
  ]);

  // repositories are the part the page needs; without them there is nothing
  // worth caching, and the curated projects stand in
  if (reposRes.status !== 'fulfilled' || !Array.isArray(reposRes.value)) return null;

  const repos = reposRes.value.map(toRepo).filter((r): r is Repo => r !== null && !r.fork);
  const activity =
    eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value)
      ? eventsRes.value.map(toActivity).filter((a): a is Activity => a !== null)
      : [];

  const data: GitHubData = { repos, activity, fetchedAt: Date.now() };
  writeCache(data);
  return data;
}

/** undefined while loading, null if GitHub could not be reached. */
export function useGitHub(): GitHubData | null | undefined {
  const [data, setData] = useState<GitHubData | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    loadGitHub()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "2 hours ago", "yesterday", "3 weeks ago". Empty for a missing date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.round((t - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(s / 86400), 'day');
  if (abs < 86400 * 30) return rtf.format(Math.round(s / (86400 * 7)), 'week');
  if (abs < 86400 * 365) return rtf.format(Math.round(s / (86400 * 30)), 'month');
  return rtf.format(Math.round(s / (86400 * 365)), 'year');
}

/** A plain-language line for one event, or null for events not worth showing. */
export function describe(a: Activity): string | null {
  switch (a.type) {
    case 'PushEvent':
      return `Pushed to ${a.repo}`;
    case 'PullRequestEvent':
      if (a.action === 'merged') return `Merged a pull request in ${a.repo}`;
      if (a.action === 'opened') return `Opened a pull request in ${a.repo}`;
      if (a.action === 'closed') return `Closed a pull request in ${a.repo}`;
      return null;
    case 'CreateEvent':
      if (a.action === 'repository') return `Started a new repo, ${a.repo}`;
      if (a.action === 'branch') return `Branched off in ${a.repo}`;
      return null;
    case 'PublicEvent':
      return `Made ${a.repo} public`;
    case 'ReleaseEvent':
      return `Released a new version of ${a.repo}`;
    default:
      return null;
  }
}
