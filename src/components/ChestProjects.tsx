import { useMemo, useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { Panel, Slot, Block } from './mc/Gui';
import type { Project } from '../types/portfolio';

const RARITY_LABEL: Record<Project['rarity'], string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

/**
 * Projects as a chest full of loot.
 *
 * The grid is a real chest: 9 columns of slots, empty ones included, so it
 * reads as inventory rather than as cards pretending to be inventory. Picking
 * a slot shows the item detail beside it, styled like a Minecraft hover
 * tooltip with the name in its rarity colour.
 */
export default function ChestProjects() {
  const { projects } = usePortfolio();

  const ordered = useMemo(
    () => [...projects].sort((a, b) => Number(b.highlight) - Number(a.highlight)),
    [projects],
  );
  const [selected, setSelected] = useState(0);

  if (ordered.length === 0) return null;
  const item = ordered[selected];

  // a chest is 27 slots; pad so the empties render like a real container
  const slots = Array.from({ length: 27 }, (_, i) => ordered[i] ?? null);

  return (
    <section
      id="projects"
      data-biome="cave"
      className="relative z-10 mx-auto max-w-6xl px-4 py-24"
    >
      <header className="mb-8 text-center" data-reveal="0">
        <p
          className="mc-out mb-3 text-[color:var(--gold)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          LARGE CHEST
        </p>
        <h2
          className="mc-out-lg text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 'clamp(16px,3vw,26px)', lineHeight: 1.4 }}
        >
          Things I&apos;ve Shipped
        </h2>
        <p className="mc-out mt-3 text-[20px] text-white/80">
          {ordered.length} items stored. Select one to inspect it.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Panel title="Chest">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
            role="listbox"
            aria-label="Projects"
          >
            {slots.map((p, i) =>
              p ? (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={i === selected}
                  onClick={() => setSelected(i)}
                  title={p.title}
                  className="mc-slot mc-slot-hover grid aspect-square place-items-center"
                  style={
                    i === selected
                      ? { boxShadow: 'inset 3px 3px 0 #373737, inset -3px -3px 0 rgba(255,255,255,.53), 0 0 0 3px #fff' }
                      : undefined
                  }
                >
                  <Block color={p.color} size={24} />
                  <span className="sr-only">{p.title}</span>
                  {p.highlight && (
                    <span
                      aria-hidden
                      className="absolute right-[2px] top-[1px] text-[color:var(--gold)]"
                      style={{ fontFamily: 'var(--px)', fontSize: 6 }}
                    >
                      ★
                    </span>
                  )}
                </button>
              ) : (
                <Slot key={`empty-${i}`} className="aspect-square opacity-70" />
              ),
            )}
          </div>
        </Panel>

        {/* ---- item detail, styled as a hover tooltip ---- */}
        <div
          className="h-fit border-[3px] border-black p-5"
          style={{
            background: '#180d24',
            boxShadow: 'inset 0 0 0 2px #2b1a3f, 10px 10px 0 rgba(0,0,0,.35)',
          }}
        >
          <h3
            className={`rarity-${item.rarity} mc-out`}
            style={{ fontFamily: 'var(--px)', fontSize: 12, color: 'var(--rc)', lineHeight: 1.5 }}
          >
            {item.title}
          </h3>
          <p className="mt-2 text-[20px] leading-snug text-[#b9a6d8]">{item.subtitle}</p>

          <p
            className="mt-3 text-[#8a7aa8]"
            style={{ fontFamily: 'var(--px)', fontSize: 7, lineHeight: 2 }}
          >
            {RARITY_LABEL[item.rarity]} · {item.material} · {item.year}
          </p>

          <p className="no-break mt-4 text-[20px] leading-snug text-[#e2d8f2]">{item.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.stack.map((s) => (
              <span
                key={s}
                className="border-2 border-black/60 bg-black/30 px-2 py-1 text-[#c9b8e8]"
                style={{ fontFamily: 'var(--px)', fontSize: 7 }}
              >
                {s}
              </span>
            ))}
          </div>

          <p className="mt-4 text-[19px] leading-snug text-[#9a8ab8]">{item.role}</p>

          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mc-btn mt-5 block px-4 py-3 text-center text-[9px]"
            >
              Open Repository
            </a>
          ) : (
            <p
              className="mt-5 border-2 border-black/50 bg-black/25 px-4 py-3 text-center text-[#8a7aa8]"
              style={{ fontFamily: 'var(--px)', fontSize: 8 }}
            >
              Private — in development
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
