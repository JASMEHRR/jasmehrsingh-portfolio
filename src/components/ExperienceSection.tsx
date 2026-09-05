import { motion } from 'framer-motion';
import { usePortfolio } from '../hooks/usePortfolio';
import { useEntrance } from '../hooks/useEntrance';

/**
 * Doc §02 §4 — numbered 01/02/03 rows from experience[]:
 * company-role title, period as a monospace pill, summary,
 * first 3 highlights, dividers between rows.
 */
export default function ExperienceSection() {
  const { experience } = usePortfolio();
  const entrance = useEntrance();
  if (experience.length === 0) return null;

  return (
    <section id="experience" className="mx-auto max-w-6xl px-6 py-24">
      <p className="mb-3 text-xs tracking-[0.22em] text-neutral-400">EXPERIENCE</p>
      <h2 className="hero-heading mb-12 text-4xl font-semibold sm:text-5xl">Where I&apos;ve worked</h2>

      <div>
        {experience.map((job, i) => (
          <motion.article
            key={`${job.company}-${job.period}`}
            {...entrance}
            transition={
              entrance.transition
                ? { ...entrance.transition, delay: Math.min(i * 0.06, 0.3) }
                : undefined
            }
            className="grid gap-4 border-t border-line py-8 md:grid-cols-[64px_minmax(0,1fr)] md:gap-8 last:border-b"
          >
            <div className="font-mono text-sm text-neutral-400">
              {String(i + 1).padStart(2, '0')}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-medium text-white sm:text-2xl">
                  {job.company} — {job.role}
                </h3>
                <span className="rounded-full border border-line px-3 py-1 font-mono text-xs text-neutral-400">
                  {job.period}
                </span>
              </div>

              <p className="no-break mt-2 text-sm text-neutral-400">{job.location}</p>
              <p className="no-break mt-3 text-neutral-300">{job.summary}</p>

              <ul className="mt-4 space-y-2">
                {job.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="no-break relative pl-5 text-sm text-neutral-400">
                    <span className="accent-gradient absolute left-0 top-2 h-1.5 w-1.5 rounded-full" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
