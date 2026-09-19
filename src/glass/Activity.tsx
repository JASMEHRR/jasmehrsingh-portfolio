import type { CSSProperties } from 'react';
import { Github } from 'lucide-react';
import { describe, timeAgo, GITHUB_USER, type Activity as Event, type GitHubData } from './github';

const DAYS = 21;

/** Local calendar day, so "today" matches the visitor's own clock. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Consecutive identical lines collapse into one with a count. */
function group(events: Event[]): { text: string; at: string; count: number }[] {
  const out: { text: string; at: string; count: number }[] = [];
  for (const e of events) {
    const text = describe(e);
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.text === text) last.count += 1;
    else out.push({ text, at: e.at, count: 1 });
  }
  return out;
}

/**
 * Where the shipping has been happening, straight from GitHub's public feed.
 *
 * Renders nothing until there is real activity to show: while GitHub is still
 * answering, if it could not be reached, or if the feed is empty. An empty
 * "recent activity" box would say the opposite of what it is there to say.
 */
export default function Activity({ github }: { github: GitHubData | null | undefined }) {
  const events = github?.activity ?? [];
  if (events.length === 0) return null;

  const now = new Date();
  const perDay = new Map<string, number>();
  const perRepo = new Map<string, number>();
  for (const e of events) {
    perDay.set(dayKey(new Date(e.at)), (perDay.get(dayKey(new Date(e.at))) ?? 0) + 1);
    if (e.repo) perRepo.set(e.repo, (perRepo.get(e.repo) ?? 0) + 1);
  }

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (DAYS - 1 - i));
    return { label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), n: perDay.get(dayKey(d)) ?? 0 };
  });
  const peak = Math.max(1, ...days.map((d) => d.n));

  const repos = [...perRepo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topRepo = repos[0]?.[1] ?? 1;
  const feed = group(events).slice(0, 7);

  return (
    <section id="activity" className="mx-auto max-w-6xl px-4 py-16 sm:py-24" aria-labelledby="activity-title">
      <header className="reveal mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--g-green)]">
            <span className="g-live-dot" aria-hidden /> Live from GitHub
          </p>
          <h2 id="activity-title" className="g-display mt-3 text-4xl font-bold sm:text-5xl">
            Shipping lately
          </h2>
        </div>
        <a
          href={`https://github.com/${GITHUB_USER}`}
          target="_blank"
          rel="noreferrer"
          className="glass glass-pill inline-flex items-center gap-2 px-5 py-2.5 font-medium"
        >
          <Github size={18} aria-hidden /> @{GITHUB_USER}
        </a>
      </header>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="glass reveal p-6 sm:p-7 lg:col-span-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--g-faint)]">
            Public activity, last {DAYS} days
          </h3>
          <div className="mt-6 flex h-40 items-end gap-1.5" role="img" aria-label={`GitHub activity per day over the last ${DAYS} days`}>
            {days.map((d, i) => (
              <div key={d.label} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.n}`}>
                <div
                  className={`g-bar ${d.n === 0 ? 'empty' : ''}`}
                  style={{ height: `${Math.max(4, (d.n / peak) * 100)}%`, '--bd': `${i * 25}ms` } as CSSProperties}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-[color:var(--g-faint)]">
            <span>{days[0].label}</span>
            <span>today</span>
          </div>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--g-faint)]">
            Where it went
          </h3>
          <ul className="mt-4 space-y-3">
            {repos.map(([name, n]) => (
              <li key={name}>
                <div className="flex justify-between text-sm">
                  <a
                    href={`https://github.com/${GITHUB_USER}/${name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[color:var(--g-ink)] hover:underline"
                  >
                    {name}
                  </a>
                  <span className="text-[color:var(--g-faint)]">{n} {n === 1 ? 'event' : 'events'}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(n / topRepo) * 100}%`,
                      background: 'linear-gradient(90deg, var(--g-cyan), var(--g-violet), var(--g-pink))',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass reveal p-6 sm:p-7 lg:col-span-2" style={{ '--d': '120ms' } as CSSProperties}>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--g-faint)]">Latest</h3>
          <ol className="mt-5 space-y-4">
            {feed.map((f) => (
              <li key={`${f.text}-${f.at}`} className="flex gap-3">
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[color:var(--g-violet)]" />
                <span>
                  <span className="block text-[color:var(--g-ink)]">
                    {f.text}
                    {f.count > 1 && <span className="text-[color:var(--g-faint)]"> ({f.count} times)</span>}
                  </span>
                  <span className="text-sm text-[color:var(--g-faint)]">{timeAgo(f.at)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
