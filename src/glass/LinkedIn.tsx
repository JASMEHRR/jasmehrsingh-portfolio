import { ArrowUpRight, Linkedin } from 'lucide-react';
import type { Profile } from '../types/portfolio';

/**
 * LinkedIn, as a card of our own.
 *
 * LinkedIn's official profile badge was embedded here for a while as the one
 * legitimate live source (it has no public API, and scraping breaks its
 * terms). It came out: it rendered with a blank avatar and a notice that
 * LinkedIn is retiring the feature on 12 December 2026, so it was about to
 * stop working anyway, and it looked out of place in the meantime.
 */
export default function LinkedIn({ profile }: { profile: Profile }) {
  const url = profile.social.linkedin;
  if (!url) return null;

  return (
    <div className="glass reveal flex h-full flex-col justify-center p-6 sm:p-8">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--g-cyan)]">
        <Linkedin size={16} aria-hidden /> On LinkedIn
      </p>
      <h3 className="g-display mt-3 text-3xl font-bold">{profile.name}</h3>
      <p className="mt-2 text-lg text-[color:var(--g-soft)]">{profile.role}</p>
      <p className="mt-1 text-[color:var(--g-soft)]">{profile.specialization.replace(/\s*·\s*/g, ', ')}</p>
      <div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="glass glass-pill mt-6 inline-flex items-center gap-2 px-5 py-2.5 font-semibold"
        >
          Connect on LinkedIn <ArrowUpRight size={18} aria-hidden />
        </a>
      </div>
    </div>
  );
}
