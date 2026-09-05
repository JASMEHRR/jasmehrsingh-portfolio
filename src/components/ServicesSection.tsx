import { motion } from 'framer-motion';
import { usePortfolio } from '../hooks/usePortfolio';
import { useEntrance } from '../hooks/useEntrance';

/**
 * Doc §02 §5 — same numbered design as Experience.
 * Rows come from portfolio.json `services[]`; this file holds no copy.
 */
export default function ServicesSection() {
  const { services } = usePortfolio();
  const entrance = useEntrance();
  if (services.length === 0) return null;

  return (
    <section id="skills" className="mx-auto max-w-6xl px-6 py-24">
      <p className="mb-3 text-xs tracking-[0.22em] text-neutral-400">SERVICES</p>
      <h2 className="hero-heading mb-12 text-4xl font-semibold sm:text-5xl">What I do</h2>

      <div>
        {services.map((s, i) => (
          <motion.article
            key={s.title}
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
              <h3 className="text-xl font-medium text-white sm:text-2xl">{s.title}</h3>
              <p className="no-break mt-3 max-w-2xl text-neutral-400">{s.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-line px-3 py-1 font-mono text-xs text-neutral-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
