import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import SocialLinks from './SocialLinks';

const NAV = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
];

/**
 * Doc §02 §8 — 3-col grid (stacked on mobile): brand / NAVIGATE / REACH OUT,
 * then a bottom strip with a divider, copyright left, build credit right.
 */
export default function Footer() {
  const { profile } = usePortfolio();
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    if (!profile.social.email) return;
    try {
      await navigator.clipboard.writeText(profile.social.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked (insecure context or denied permission) — the
      // mailto link below still works, so fail quietly.
      setCopied(false);
    }
  };

  return (
    <footer id="contact" className="border-t border-line px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <p className="hero-heading text-3xl font-semibold">{profile.name}</p>
          <p className="mt-2 text-sm text-neutral-400">{profile.specialization}</p>
          <p className="mt-1 text-sm text-neutral-400">{profile.location}</p>
        </div>

        <div>
          <p className="mb-4 text-xs tracking-[0.22em] text-neutral-400">NAVIGATE</p>
          <ul className="space-y-2">
            {NAV.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-neutral-400 transition-colors hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-xs tracking-[0.22em] text-neutral-400">REACH OUT</p>

          {profile.social.email && (
            <div className="mb-2 flex items-center gap-2">
              <a
                href={`mailto:${profile.social.email}`}
                className="text-neutral-300 transition-colors hover:text-white"
              >
                {profile.social.email}
              </a>
              <button
                type="button"
                onClick={copyEmail}
                aria-label="Copy email address"
                className="grid h-7 w-7 place-items-center rounded-md border border-line text-neutral-400 transition-colors hover:text-white"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}

          {profile.social.phone && (
            <a
              href={`tel:${profile.social.phone.replace(/\s/g, '')}`}
              className="mb-5 block text-neutral-400 transition-colors hover:text-white"
            >
              {profile.social.phone}
            </a>
          )}

          <SocialLinks social={profile.social} variant="plain" />
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-neutral-400">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>Built with Claude Code</span>
      </div>
    </footer>
  );
}
