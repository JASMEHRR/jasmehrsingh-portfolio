import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';

/** Doc §02 §2 — HOME, ABOUT, SKILLS, PROJECTS, CONTACT with smooth scroll. */
const LINKS = [
  { label: 'HOME', href: '#home' },
  { label: 'ABOUT', href: '#about' },
  { label: 'SKILLS', href: '#skills' },
  { label: 'PROJECTS', href: '#projects' },
  { label: 'CONTACT', href: '#contact' },
];

export default function Navbar() {
  const { profile } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${
        scrolled ? 'border-b border-line bg-bg/80 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#home" className="text-lg font-medium tracking-wide text-white">
          {profile.shortName}
          <span className="accent-gradient ml-0.5 inline-block h-1.5 w-1.5 rounded-full align-middle" />
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-xs tracking-[0.18em] text-neutral-400 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-md border border-line text-neutral-300 md:hidden"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </nav>

      {open && (
        <ul className="border-t border-line bg-bg/95 px-6 py-3 backdrop-blur-md md:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-2 text-xs tracking-[0.18em] text-neutral-400 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
