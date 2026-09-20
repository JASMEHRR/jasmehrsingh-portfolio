import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { ArrowUpRight, Check, Copy, Github, Linkedin, Mail, Pause, Phone, Sparkles } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useCountUp, useMotion, useReveal } from './motion';
import { useCursorFx } from './cursorFx';
import { CHROMIUM, useLiquidLens } from './liquidLens';
import LiquidCursor from './LiquidCursor';
import { useGitHub } from './github';
import { GrassCube } from './GrassBlock';
import Work from './Work';
import Activity from './Activity';
import LinkedIn from './LinkedIn';
import Skills from './Skills';
import type { Ore } from '../types/portfolio';
import './glass.css';

/**
 * The glass portfolio, served at /.
 *
 * This is the page a recruiter lands on. The Minecraft version exists but is
 * deliberately low-key: one tiny grass block in the nav bar, and nothing else
 * on the page points at it.
 *
 * All profile copy comes from portfolio.json through usePortfolio; only
 * section labels are written here. Projects and the activity feed are topped
 * up live from GitHub.
 */

const BLOBS: CSSProperties[] = [
  { width: 520, height: 520, left: '-8%', top: '6%', background: '#8b6cff', '--dx': '90px', '--dy': '60px', '--dur': '26s', '--depth': 0.12 } as CSSProperties,
  { width: 440, height: 440, right: '-6%', top: '-4%', background: '#ff5ca8', '--dx': '-70px', '--dy': '80px', '--dur': '22s', '--depth': 0.2 } as CSSProperties,
  { width: 380, height: 380, left: '38%', top: '48%', background: '#3ad8ff', '--dx': '80px', '--dy': '-60px', '--dur': '30s', '--depth': 0.08 } as CSSProperties,
  { width: 300, height: 300, left: '6%', bottom: '-6%', background: '#7ee06f', '--dx': '60px', '--dy': '-40px', '--dur': '24s', '--depth': 0.16, opacity: 0.4 } as CSSProperties,
  { width: 340, height: 340, right: '10%', bottom: '4%', background: '#ffbe55', '--dx': '-50px', '--dy': '-70px', '--dur': '28s', '--depth': 0.1, opacity: 0.35 } as CSSProperties,
];

function Backdrop() {
  return (
    <div className="g-backdrop" aria-hidden>
      {BLOBS.map((style, i) => (
        <div key={i} className="g-blob" style={style} />
      ))}
      {/* the light that trails the pointer behind the glass; see cursorFx */}
      <div className="g-glow" />
      <div className="g-grain" />
    </div>
  );
}

/**
 * Pauses the blob drift once the hero has scrolled away (.g-backdrop.still in
 * glass.css). Below the hero the page is mostly glass, and a drifting
 * backdrop makes every visible panel redraw on every frame.
 */
function useDriftWhileHeroVisible() {
  useEffect(() => {
    const hero = document.querySelector('.g-hero');
    const backdrop = document.querySelector('.g-backdrop');
    if (!hero || !backdrop || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry) backdrop.classList.toggle('still', !entry.isIntersecting);
    });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
}

/**
 * Scroll progress as a CSS variable, without re-rendering React.
 *
 * Written only onto the two elements that read it, the backdrop (parallax)
 * and the progress bar. It used to go on <html>, and a custom property
 * changed on the root is inherited by everything, so every scroll frame made
 * the browser restyle the entire page on top of redrawing the glass blur.
 */
function useScrollVars() {
  useEffect(() => {
    const root = document.documentElement;
    const targets = [
      document.querySelector<HTMLElement>('.g-backdrop'),
      document.querySelector<HTMLElement>('.g-progress'),
    ].filter((el): el is HTMLElement => el !== null);
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = root.scrollHeight - window.innerHeight;
      const progress = String(max > 0 ? window.scrollY / max : 0);
      for (const el of targets) el.style.setProperty('--progress', progress);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

/** Which nav link each section belongs to. Sections not listed (the hero, the numbers, About) light none. */
const SECTION_LINK: Record<string, string> = {
  work: '#work',
  activity: '#work',
  journey: '#journey',
  skills: '#skills',
  contact: '#contact',
};

/**
 * The nav link for the section being read, as the page scrolls.
 *
 * An observer watches a thin line 40% of the way down the screen rather than
 * listening to scroll, so it costs nothing per frame. The sections sit end to
 * end, so the line is always inside one of them. `version` re-observes after
 * the GitHub data changes the sections.
 */
function useScrollSpy(version: unknown): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'));
    if (sections.length === 0 || !('IntersectionObserver' in window)) return;
    const onLine = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) onLine.add(e.target);
          else onLine.delete(e.target);
        }
        // where two sections meet on the line, the lower one wins, so a tab
        // lights as soon as its section's heading reaches it
        const current = sections.filter((s) => onLine.has(s)).pop();
        setActive(current ? (SECTION_LINK[current.id] ?? null) : null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [version]);
  return active;
}

function Nav({
  name,
  motion,
  toggleMotion,
  version,
}: {
  name: string;
  motion: boolean;
  toggleMotion: () => void;
  version: unknown;
}) {
  // The glass bead that springs between links. It sits on the tab for the
  // section being read, follows the pointer across the others, and goes
  // back when the pointer leaves. Positioned from the link's own offsets.
  const blob = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const hovering = useRef(false);
  const active = useScrollSpy(version);
  const place = (a: HTMLAnchorElement | null | undefined) => {
    const b = blob.current;
    if (!b) return;
    if (!a) {
      b.classList.remove('on');
      return;
    }
    b.style.setProperty('--x', `${a.offsetLeft}px`);
    b.style.setProperty('--w', `${a.offsetWidth}px`);
    b.classList.add('on');
  };
  // Pointer events rather than mouse ones: a tap on a touch screen sends a
  // mouseenter but never the mouseleave, which left the bead stuck on the
  // tapped link, whereas pointerleave follows every tap once the finger lifts
  const moveTo = (e: SyntheticEvent<HTMLAnchorElement>) => {
    hovering.current = true;
    place(e.currentTarget);
  };
  const settle = () => {
    hovering.current = false;
    place(active ? linkRefs.current.get(active) : null);
  };
  useEffect(() => {
    let current = true;
    const onActive = () => {
      if (current && !hovering.current) place(active ? linkRefs.current.get(active) : null);
    };
    onActive();
    // measured again once the web fonts are in: a page reopened mid-scroll
    // lights a tab straight away, sized to the fallback font
    void document.fonts?.ready.then(onActive);
    return () => {
      current = false;
    };
  }, [active]);
  const links = [
    ['Work', '#work'],
    ['Journey', '#journey'],
    ['Skills', '#skills'],
    ['Contact', '#contact'],
  ];
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-3">
      <nav
        aria-label="Main"
        data-lens
        className="glass glass-pill flex items-center gap-1 py-1.5 pl-1.5 pr-1.5 sm:gap-2"
      >
        <a
          href="#top"
          className="g-display grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm font-bold"
          aria-label={`${name}, back to top`}
        >
          {initials(name)}
        </a>
        <ul className="relative hidden items-center sm:flex" onPointerLeave={settle}>
          <span ref={blob} className="g-nav-blob" aria-hidden />
          {links.map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                ref={(el) => {
                  if (el) linkRefs.current.set(href, el);
                  else linkRefs.current.delete(href);
                }}
                data-magnet
                aria-current={active === href ? 'location' : undefined}
                onPointerEnter={moveTo}
                onFocus={moveTo}
                onBlur={settle}
                className="relative z-[1] inline-block rounded-full px-3.5 py-2 text-sm font-medium text-[color:var(--g-soft)] transition-colors hover:text-[color:var(--g-ink)] aria-[current=location]:text-[color:var(--g-ink)]"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          data-magnet
          onClick={toggleMotion}
          aria-pressed={motion}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[color:var(--g-soft)] transition-colors hover:bg-white/10 hover:text-[color:var(--g-ink)]"
          title={motion ? 'Turn animation off' : 'Turn animation on'}
        >
          {motion ? <Sparkles size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
          <span>Motion {motion ? 'on' : 'off'}</span>
        </button>
        <a
          href="/minecraft"
          data-magnet
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
          title="Play the Minecraft version"
        >
          <GrassCube size={18} />
          <span className="sr-only">Play the Minecraft version</span>
        </a>
      </nav>
    </header>
  );
}

function Stat({ ore, motion, delay }: { ore: Ore; motion: boolean; delay: number }) {
  const { ref, shown } = useCountUp(ore.value, motion);
  return (
    <div className="glass reveal p-5 sm:p-6" style={{ '--d': `${delay}ms` } as CSSProperties}>
      <p
        ref={(el) => {
          ref.current = el;
        }}
        className="g-display text-4xl font-bold sm:text-5xl"
        style={{ color: ore.color, textShadow: `0 0 30px ${ore.color}55` }}
      >
        {/* the counting digits are decoration; the real figure is what is read */}
        <span aria-hidden>{shown}</span>
        <span className="sr-only">{ore.value}</span>
      </p>
      <p className="mt-2 text-sm leading-snug text-[color:var(--g-soft)]">{ore.label}</p>
    </div>
  );
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked (insecure context, permissions): the mailto link beside this still works
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="glass glass-pill inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
    >
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      {copied ? 'Copied' : 'Copy email'}
    </button>
  );
}

export default function GlassApp() {
  const { profile, game, experience, skills, education, services, projects } = usePortfolio();
  const [motion, toggleMotion] = useMotion();
  const fine = useMediaQuery('(pointer: fine) and (hover: hover)');
  useCursorFx(motion && fine);
  const github = useGitHub();
  useScrollVars();
  useDriftWhileHeroVisible();
  // rescan once GitHub data lands, so the cards it adds are revealed and
  // given their lens too
  useReveal(github);
  useLiquidLens(github);

  const openTo = game.openTo ? `Open to ${game.openTo.charAt(0).toLowerCase()}${game.openTo.slice(1)}` : '';
  const taglineWords = profile.tagline.replace(/\.$/, '').split(' ');
  const lastWord = taglineWords.pop() ?? '';
  const { social } = profile;

  return (
    <>
      <Backdrop />
      <div className="g-progress" aria-hidden />
      {motion && fine && CHROMIUM && <LiquidCursor />}
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-[80] focus:rounded-full focus:bg-black focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Nav name={profile.name} motion={motion} toggleMotion={toggleMotion} version={github} />

      <main id="top" className="relative z-10">
        {/* ------------------------------------------------ hero */}
        <section className="g-hero mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-4 pb-16 pt-32 text-center">
          <div className="flex flex-col items-center">
            {openTo && (
              <p
                data-lens
                className="g-depth reveal glass glass-pill inline-flex items-center gap-2.5 px-4 py-2 text-sm font-medium"
                style={{ '--dz': '10px' } as CSSProperties}
              >
                <span className="g-live-dot" aria-hidden />
                {openTo}
              </p>
            )}
            <h1
              className="g-depth g-display reveal mt-6 text-[clamp(3rem,9vw,6.5rem)] font-extrabold leading-[0.95]"
              style={{ '--d': '80ms', '--dz': '34px' } as CSSProperties}
            >
              {profile.name}
            </h1>
            <p
              className="g-depth g-display reveal mt-5 text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold leading-tight"
              style={{ '--d': '160ms', '--dz': '20px' } as CSSProperties}
            >
              {taglineWords.join(' ')} <span className="g-gradient-text">{lastWord}.</span>
            </p>
            <p
              className="g-depth reveal mt-5 max-w-2xl text-lg text-[color:var(--g-soft)]"
              style={{ '--d': '240ms', '--dz': '12px' } as CSSProperties}
            >
              {profile.role}. {profile.specialization.replace(/\s*·\s*/g, ', ')}.
            </p>
            <div className="reveal mt-8 flex flex-wrap justify-center gap-3" style={{ '--d': '320ms' } as CSSProperties}>
              {social.linkedin && (
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  data-lens
                  className="glass glass-pill inline-flex items-center gap-2 px-5 py-3 font-semibold"
                >
                  <Linkedin size={18} aria-hidden /> LinkedIn
                </a>
              )}
              {social.github && (
                <a
                  href={social.github}
                  target="_blank"
                  rel="noreferrer"
                  data-lens
                  className="glass glass-pill inline-flex items-center gap-2 px-5 py-3 font-semibold"
                >
                  <Github size={18} aria-hidden /> GitHub
                </a>
              )}
              {social.email && (
                <a
                  href={`mailto:${social.email}`}
                  data-lens
                  className="glass glass-pill inline-flex items-center gap-2 px-5 py-3 font-semibold"
                >
                  <Mail size={18} aria-hidden /> Email me
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ numbers */}
        <section className="mx-auto max-w-6xl px-4 py-12" aria-label="In numbers">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {game.ores.map((ore, i) => (
              <Stat key={ore.label} ore={ore} motion={motion} delay={(i % 3) * 90} />
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ about */}
        <section id="about" className="mx-auto max-w-6xl px-4 py-20 sm:py-28" aria-labelledby="about-title">
          <div className="grid gap-5 lg:grid-cols-5">
            <div className="glass reveal p-7 sm:p-9 lg:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--g-pink)]">About</p>
              <h2 id="about-title" className="g-display mt-3 text-4xl font-bold">
                Hi, I'm {profile.shortName}.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-[color:var(--g-soft)]">{profile.bio}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-3">
              {services.map((s, i) => (
                <div key={s.title} className="glass reveal p-6" style={{ '--d': `${(i % 2) * 90}ms` } as CSSProperties}>
                  <h3 className="g-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-3 text-[color:var(--g-soft)]">{s.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <li key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Work projects={projects} github={github} />
        <Activity github={github} />

        {/* ------------------------------------------------ journey */}
        <section id="journey" className="mx-auto max-w-4xl px-4 py-20 sm:py-28" aria-labelledby="journey-title">
          <header className="reveal mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--g-amber)]">Journey</p>
            <h2 id="journey-title" className="g-display mt-3 text-4xl font-bold sm:text-5xl">
              Where I've worked
            </h2>
          </header>
          <ol className="relative space-y-6 border-l border-white/15 pl-6 sm:pl-10">
            {experience.map((job, i) => (
              <li key={`${job.company}-${job.period}`} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[31px] top-7 h-3.5 w-3.5 rounded-full sm:-left-[47px]"
                  style={{
                    background: 'linear-gradient(135deg, var(--g-cyan), var(--g-pink))',
                    boxShadow: '0 0 16px rgba(139,108,255,.8)',
                  }}
                />
                <article className="glass reveal p-6 sm:p-7" style={{ '--d': `${(i % 2) * 80}ms` } as CSSProperties}>
                  <p className="text-sm font-medium text-[color:var(--g-faint)]">{job.period}</p>
                  <h3 className="g-display mt-1 text-2xl font-semibold">{job.role}</h3>
                  <p className="text-[color:var(--g-soft)]">{job.company}</p>
                  {job.summary && <p className="mt-3 text-[color:var(--g-soft)]">{job.summary}</p>}
                  {job.highlights.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {job.highlights.map((h) => (
                        <li key={h} className="flex gap-3 text-[color:var(--g-soft)]">
                          <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--g-cyan)]" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------ skills + education */}
        <section id="skills" className="mx-auto max-w-6xl px-4 py-20 sm:py-28" aria-labelledby="skills-title">
          <header className="reveal mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--g-violet)]">Skills</p>
            <h2 id="skills-title" className="g-display mt-3 text-4xl font-bold sm:text-5xl">
              What I bring
            </h2>
          </header>
          <Skills categories={skills.categories} />

          <h3 className="g-display reveal mt-16 text-3xl font-bold">Education</h3>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {education.map((ed, i) => (
              <div key={ed.institution} className="glass reveal p-6" style={{ '--d': `${i * 90}ms` } as CSSProperties}>
                <p className="text-sm font-medium text-[color:var(--g-faint)]">{ed.period}</p>
                <h4 className="g-display mt-1 text-lg font-semibold leading-snug">{ed.degree}</h4>
                <p className="mt-1 text-[color:var(--g-soft)]">{ed.institution}</p>
                {ed.result && <p className="mt-3 text-sm font-semibold text-[color:var(--g-green)]">{ed.result}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ contact */}
        <section id="contact" className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:pt-28" aria-labelledby="contact-title">
          <header className="reveal mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--g-cyan)]">Contact</p>
            <h2 id="contact-title" className="g-display mt-3 text-4xl font-bold sm:text-6xl">
              Let's <span className="g-gradient-text">talk</span>.
            </h2>
          </header>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LinkedIn profile={profile} />
            </div>
            <div className="glass reveal flex flex-col gap-3 p-6 sm:p-7" style={{ '--d': '100ms' } as CSSProperties}>
              <h3 className="g-display text-xl font-semibold">Reach me directly</h3>
              {social.email && (
                <>
                  <a
                    href={`mailto:${social.email}`}
                    className="glass glass-pill inline-flex items-center gap-2 break-all px-4 py-2.5 text-sm font-medium"
                  >
                    <Mail size={16} aria-hidden className="shrink-0" /> {social.email}
                  </a>
                  <CopyEmail email={social.email} />
                </>
              )}
              {social.phone && (
                <a
                  href={`tel:${social.phone.replace(/\s/g, '')}`}
                  className="glass glass-pill inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
                >
                  <Phone size={16} aria-hidden /> {social.phone}
                </a>
              )}
              {social.github && (
                <a
                  href={social.github}
                  target="_blank"
                  rel="noreferrer"
                  className="glass glass-pill inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
                >
                  <Github size={16} aria-hidden /> GitHub <ArrowUpRight size={14} aria-hidden />
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-4 pb-10 text-center text-sm text-[color:var(--g-faint)]">
        Designed and built with Claude Code. © {new Date().getFullYear()} {profile.name}
      </footer>
    </>
  );
}
