import type { CSSProperties } from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import type { Project } from '../types/portfolio';
import { timeAgo, undash, type GitHubData, type Repo } from './github';
import { EditPencil } from './EditMode';
import { useEdit } from './editContext';

/** The repository name at the end of a GitHub link, lower-cased for matching. */
function repoKey(link: string): string | null {
  const m = /github\.com\/[^/]+\/([^/?#]+)/i.exec(link);
  return m ? m[1].toLowerCase() : null;
}

function ProjectCard({ p, repo, delay, span }: { p: Project; repo?: Repo; delay: number; span: string }) {
  // curated copy always wins; GitHub fills in what only it knows
  const stack = p.stack.length > 0 ? p.stack : repo?.language ? [repo.language] : [];
  const updated = repo?.pushedAt ? timeAgo(repo.pushedAt) : '';

  return (
    <article
      className={`glass reveal flex flex-col p-6 sm:p-7 ${span}`}
      // tints the glass's drop shadow with the project's colour; the rim and
      // thickness shading come from .glass. With no colour the variable is
      // left unset so var()'s fallback applies: 'undefined99' would be
      // invalid and take the whole box-shadow, rim light included, with it
      style={{ '--d': `${delay}ms`, '--shadow-c': p.color ? `${p.color}99` : undefined } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="g-display text-2xl font-semibold text-[color:var(--g-ink)] sm:text-[1.7rem]">{p.title}</h3>
          <p className="mt-1 text-[color:var(--g-soft)]">{undash(p.subtitle)}</p>
        </div>
        <span
          aria-hidden
          className="mt-2 h-3 w-3 shrink-0 rounded-full"
          style={{ background: p.color, boxShadow: `0 0 18px ${p.color}` }}
        />
      </div>

      <p className="mt-4 flex-1 leading-relaxed text-[color:var(--g-soft)]">{undash(p.description)}</p>

      {stack.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Built with">
          {stack.map((s) => (
            <li key={s} className="glass glass-pill px-3 py-1 text-xs font-medium text-[color:var(--g-ink)]">
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-[color:var(--g-faint)]">
          {updated ? `Updated ${updated} on GitHub` : p.year}
        </span>
        {p.link ? (
          <a
            href={p.link}
            target="_blank"
            rel="noreferrer"
            className="glass glass-pill inline-flex items-center gap-1.5 px-4 py-2 font-medium text-[color:var(--g-ink)]"
          >
            View code <ArrowUpRight size={16} aria-hidden />
            <span className="sr-only">for {p.title} on GitHub</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[color:var(--g-faint)]">
            <Lock size={14} aria-hidden /> Not public yet
          </span>
        )}
      </div>
    </article>
  );
}

/**
 * Selected work, then everything else that is public on GitHub.
 *
 * The curated projects in portfolio.json lead, because they carry the write
 * ups. GitHub adds each one's language and last push, and any public repo
 * not written up yet still appears below, so a new project shows up here the
 * day it is pushed rather than the day the JSON is edited.
 */
export default function Work({ projects, github }: { projects: Project[]; github: GitHubData | null | undefined }) {
  // A project added in the editor and left untitled would otherwise show
  // visitors an empty card. It stays on screen while editing, so whoever
  // added it can see it and fill it in.
  const editing = useEdit()?.editing ?? false;
  const listed = editing ? projects : projects.filter((p) => p?.title?.trim() !== '');
  const byName = new Map((github?.repos ?? []).map((r) => [r.name.toLowerCase(), r]));
  const curatedKeys = new Set<string>();
  const cards = listed.map((p) => {
    const key = p.link ? repoKey(p.link) : null;
    if (key) curatedKeys.add(key);
    return { p, repo: key ? byName.get(key) : undefined };
  });
  // highlighted work first, otherwise in the order the JSON gives
  cards.sort((a, b) => Number(b.p.highlight) - Number(a.p.highlight));

  // No holes in the grid. Every highlighted card used to span two of the
  // three columns, and three of them in a row left the third column empty
  // beside each one. Now only as many cards go wide as it takes to make the
  // last row come out full (highlighted ones first), and the grid packs
  // densely, so the cells always add up to complete rows. On the two-column
  // layout an odd count lets the last card take the whole final row.
  const n = cards.length;
  const wide = (3 - (n % 3)) % 3;
  const spanFor = (i: number) => {
    if (n === 1) return 'md:col-span-2 lg:col-span-3';
    if (i < wide) return 'lg:col-span-2';
    if (n % 2 === 1 && i === n - 1) return 'md:col-span-2 lg:col-span-1';
    return '';
  };

  const more = (github?.repos ?? [])
    .filter((r) => !curatedKeys.has(r.name.toLowerCase()))
    .sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt));

  return (
    <section id="work" className="mx-auto max-w-6xl px-4 py-20 sm:py-28" aria-labelledby="work-title">
      <header className="reveal mb-10 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--g-cyan)]">Selected work</p>
        <div className="mt-3 flex items-center gap-2">
          <h2 id="work-title" className="g-display text-4xl font-bold sm:text-5xl">
            Things I've built
          </h2>
          <EditPencil card="projects" />
        </div>
        <p className="mt-4 text-lg text-[color:var(--g-soft)]">
          Products I have directed, tested and shipped with Claude Code. Update times come live from GitHub.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-flow-row-dense lg:grid-cols-3">
        {cards.map(({ p, repo }, i) => (
          <ProjectCard key={`${i}-${p.id}`} p={p} repo={repo} delay={(i % 3) * 90} span={spanFor(i)} />
        ))}
      </div>

      {more.length > 0 && (
        <div className="reveal mt-14">
          <h3 className="g-display text-2xl font-semibold">More on GitHub</h3>
          <p className="mt-2 text-[color:var(--g-soft)]">Public repositories that are not written up here yet.</p>
          {/* grid-cols-1 is minmax(0, 1fr): without an explicit zero minimum the
              column sizes itself to the longest single-line repo name instead
              of letting it truncate, which widened the whole page on a phone */}
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {more.map((r) => (
              <li key={r.name} className="min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[color:var(--g-ink)]">{r.name}</span>
                    {r.description && (
                      <span className="mt-0.5 block truncate text-sm text-[color:var(--g-soft)]">{r.description}</span>
                    )}
                    <span className="mt-1 block text-xs text-[color:var(--g-faint)]">
                      {[r.language, r.pushedAt && `updated ${timeAgo(r.pushedAt)}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <ArrowUpRight size={18} className="shrink-0 text-[color:var(--g-soft)]" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
