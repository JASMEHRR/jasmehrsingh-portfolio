import { Quote, Sparkles, Star } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import type { Testimonial } from '../types/portfolio';

/**
 * Doc §02 §7 — dark background, decorative icons, CSS-only infinite
 * right-to-left marquee, pause on hover, reduced-motion scroll-snap
 * fallback (handled in index.css).
 *
 * Doc §05 tip — when testimonials[] is empty the whole section is hidden
 * rather than filled with obviously-fake quotes.
 */
function Card({ t }: { t: Testimonial }) {
  return (
    <figure className="mr-6 w-[320px] shrink-0 rounded-2xl border border-line bg-card p-6 sm:w-[380px]">
      <Quote size={18} className="mb-3 text-neutral-400" />
      <blockquote className="no-break italic leading-relaxed text-neutral-300">
        “{t.quote}”
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span
          className="grid h-9 w-9 place-items-center rounded-full text-sm font-medium text-white"
          style={{ background: t.avatarColor }}
        >
          {t.name.charAt(0)}
        </span>
        <span>
          <span className="block text-sm uppercase tracking-wider text-white">{t.name}</span>
          <span className="block text-xs text-neutral-400">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export default function TestimonialsSection() {
  const { testimonials } = usePortfolio();
  if (testimonials.length === 0) return null;

  // duplicated so the -50% translate loops seamlessly
  const loop = [...testimonials, ...testimonials];

  return (
    <section className="border-y border-line bg-[#080808] py-24">
      <div className="mx-auto mb-12 max-w-6xl px-6">
        <p className="mb-3 flex items-center gap-2 text-xs tracking-[0.22em] text-neutral-400">
          <Sparkles size={13} /> TESTIMONIALS <Star size={13} />
        </p>
        <h2 className="hero-heading text-4xl font-semibold sm:text-5xl">What people say</h2>
      </div>

      <div className="marquee-viewport overflow-hidden">
        <div className="marquee-track">
          {loop.map((t, i) => (
            <Card key={`${t.id}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
