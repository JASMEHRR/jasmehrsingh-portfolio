import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Linkedin } from 'lucide-react';
import type { Profile } from '../types/portfolio';

const BADGE_SCRIPT = 'https://platform.linkedin.com/badges/js/profile.js';

declare global {
  interface Window {
    LIRenderAll?: () => void;
  }
}

/** The /in/<vanity> part of a LinkedIn profile URL. */
function vanityOf(url: string): string | null {
  const m = /linkedin\.com\/in\/([^/?#]+)/i.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * LinkedIn, as live as LinkedIn allows.
 *
 * LinkedIn has no public API for profiles or posts, and scraping it breaks its
 * terms, so the one legitimate live source is its official profile badge: a
 * script from LinkedIn that renders the current photo, headline and role.
 * That is what this embeds, next to a card of its own.
 *
 * The badge script is third party and not always dependable, so it is only
 * fetched once this section is close to the viewport, and if no badge has
 * appeared after a few seconds its slot is removed. The card beside it never
 * depends on LinkedIn answering.
 */
export default function LinkedIn({ profile }: { profile: Profile }) {
  const url = profile.social.linkedin;
  const vanity = url ? vanityOf(url) : null;
  const slot = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState<'waiting' | 'shown' | 'failed'>('waiting');

  useEffect(() => {
    const el = slot.current;
    if (!el || !vanity) return;
    let timer = 0;

    const load = () => {
      const render = () => window.LIRenderAll?.();
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${BADGE_SCRIPT}"]`);
      if (existing) render();
      else {
        const s = document.createElement('script');
        s.src = BADGE_SCRIPT;
        s.async = true;
        s.onload = render;
        s.onerror = () => setBadge('failed');
        document.body.appendChild(s);
      }
      timer = window.setTimeout(() => {
        setBadge(el.querySelector('iframe') ? 'shown' : 'failed');
      }, 7000);
    };

    if (!('IntersectionObserver' in window)) {
      load();
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        load();
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [vanity]);

  if (!url) return null;

  return (
    <div className="glass reveal flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center">
      <div className="flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--g-cyan)]">
          <Linkedin size={16} aria-hidden /> On LinkedIn
        </p>
        <h3 className="g-display mt-3 text-3xl font-bold">{profile.name}</h3>
        <p className="mt-2 text-[color:var(--g-soft)]">{profile.role}</p>
        {vanity && badge !== 'failed' && (
          <p className="mt-4 text-[color:var(--g-soft)]">
            The card here is LinkedIn's own profile badge, so it stays as current as my profile does.
          </p>
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="glass glass-pill mt-6 inline-flex items-center gap-2 px-5 py-2.5 font-semibold"
        >
          Connect on LinkedIn <ArrowUpRight size={18} aria-hidden />
        </a>
      </div>

      {vanity && badge !== 'failed' && (
        <div ref={slot} className="min-h-[1px] shrink-0 overflow-hidden rounded-2xl">
          <div
            className="badge-base LI-profile-badge"
            data-locale="en_US"
            data-size="large"
            data-theme="dark"
            data-type="VERTICAL"
            data-vanity={vanity}
            data-version="v1"
          />
        </div>
      )}
    </div>
  );
}
