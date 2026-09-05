import { motion } from 'framer-motion';
import { usePortfolio } from '../hooks/usePortfolio';
import { useEntrance } from '../hooks/useEntrance';

/**
 * Doc §02 §3 — headline + bio bound to JSON.
 * overflow-wrap: normal / word-break: normal via .no-break so nothing
 * breaks mid-word (the focu/s on, incredibl/e bug from §01 lesson 5).
 */
export default function AboutSection() {
  const { profile } = usePortfolio();
  const entrance = useEntrance();

  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-24">
      <motion.div
        {...entrance}
        className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
      >
        <div>
          <p className="mb-3 text-xs tracking-[0.22em] text-neutral-400">ABOUT</p>
          <h2 className="hero-heading text-4xl font-semibold leading-tight sm:text-5xl">
            {profile.role}
          </h2>
          <p className="mt-4 text-sm text-neutral-400">
            {profile.yearsOfExperience} years · {profile.specialization}
          </p>
        </div>

        <p className="no-break text-lg leading-relaxed text-neutral-300">{profile.bio}</p>
      </motion.div>
    </section>
  );
}
