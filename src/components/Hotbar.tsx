import { useEffect, useState } from 'react';
import { Item } from './mc/Gui';

type Dest = { label: string; href: string; icon: string; external?: boolean };

/**
 * Bottom hotbar navigation.
 *
 * Slots mirror the page sections and respond to the number keys the way
 * Minecraft's hotbar does. The active slot tracks whichever section the
 * biome engine has selected, so the highlight and the world always agree.
 */
const DESTS: Dest[] = [
  { label: 'Profile', href: '#home', icon: '/tex/grass_top.png' },
  { label: 'Skills', href: '#skills', icon: '/tex/bookshelf.png' },
  { label: 'Journey', href: '#experience', icon: '/tex/planks.png' },
  { label: 'Projects', href: '#projects', icon: '/tex/item_chest.png' },
  { label: 'The Mine', href: '#mine', icon: '/tex/ore_diamond.png' },
  { label: 'Advancements', href: '#about', icon: '/tex/item_gold.png' },
  { label: 'Contact', href: '#contact', icon: '/tex/item_book.png' },
  { label: 'Arcade', href: '/arcade/', icon: '/tex/item_amethyst.png', external: true },
];

export default function Hotbar() {
  const [active, setActive] = useState(0);
  const [tip, setTip] = useState<string | null>(null);

  // keep the highlight in step with the section the reader is actually in
  useEffect(() => {
    const ids = DESTS.filter((d) => !d.external).map((d) => d.href.slice(1));
    const sync = () => {
      const middle = window.innerHeight / 2;
      let bestIndex = 0;
      let bestDistance = Infinity;
      ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const { top, bottom } = el.getBoundingClientRect();
        const centre = (top + bottom) / 2;
        const d = Math.abs(centre - middle);
        if (d < bestDistance) {
          bestDistance = d;
          bestIndex = i;
        }
      });
      setActive(bestIndex);
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, []);

  // number keys jump between sections, as they would in game
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > DESTS.length) return;
      const dest = DESTS[n - 1];
      if (dest.external) {
        window.location.href = dest.href;
      } else {
        document.querySelector(dest.href)?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {tip && (
        <div
          className="mc-out pointer-events-none fixed bottom-[92px] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          {tip}
        </div>
      )}

      <nav
        aria-label="Sections"
        className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 border-[3px] border-black p-1"
        style={{ background: 'rgba(0,0,0,.55)', boxShadow: 'inset 0 0 0 2px #7b7b7b' }}
      >
        <ul className="flex">
          {DESTS.map((d, i) => (
            <li key={d.href}>
              <a
                href={d.href}
                aria-current={!d.external && i === active ? 'true' : undefined}
                onMouseEnter={() => setTip(d.label)}
                onMouseLeave={() => setTip(null)}
                onFocus={() => setTip(d.label)}
                onBlur={() => setTip(null)}
                className="mc-slot mc-slot-hover grid h-[38px] w-[38px] place-items-center min-[430px]:h-[46px] min-[430px]:w-[46px] sm:h-[54px] sm:w-[54px]"
                style={
                  !d.external && i === active
                    ? {
                        boxShadow:
                          'inset 3px 3px 0 #373737, inset -3px -3px 0 rgba(255,255,255,.53), 0 0 0 3px #fff, 0 0 0 5px #000',
                      }
                    : undefined
                }
              >
                <Item src={d.icon} size={28} />
                <span className="sr-only">{d.label}</span>
                <span
                  aria-hidden
                  className="absolute bottom-[1px] right-[3px] text-white"
                  style={{ fontFamily: 'var(--px)', fontSize: 7, textShadow: '1px 1px 0 #000' }}
                >
                  {i + 1}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
