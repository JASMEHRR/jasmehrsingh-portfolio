import { useMemo, useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { Panel, Item } from './mc/Gui';

const COLS = 8;
const ROWS = 4;

/**
 * The playable bit: a wall of stone with the real numbers buried in it.
 *
 * Every ore is a genuine statistic from the JSON, so digging is not a toy
 * detached from the content — it is the stats section, just one that makes
 * you work for it. A "reveal all" control is always available so the numbers
 * are never locked behind interaction for anyone using a keyboard, a screen
 * reader, or simply in a hurry.
 */
export default function MiniMine() {
  const { game } = usePortfolio();
  const total = COLS * ROWS;

  // deterministic layout: ore positions are spread evenly, not random, so the
  // grid looks composed and every reload behaves the same
  const oreAt = useMemo(() => {
    const map = new Map<number, number>();
    const step = Math.floor(total / Math.max(1, game.ores.length));
    game.ores.forEach((_, i) => {
      const cell = (i * step + 5 + ((i * 3) % 5)) % total;
      map.set(cell, i);
    });
    return map;
  }, [game.ores, total]);

  const [broken, setBroken] = useState<Set<number>>(new Set());
  const [found, setFound] = useState<number | null>(null);

  const mine = (cell: number) => {
    setBroken((prev) => {
      if (prev.has(cell)) return prev;
      const next = new Set(prev);
      next.add(cell);
      return next;
    });
    const ore = oreAt.get(cell);
    if (ore !== undefined) setFound(ore);
  };

  const revealAll = () => {
    setBroken(new Set(Array.from({ length: total }, (_, i) => i)));
    setFound(0);
  };

  const foundCount = Array.from(oreAt.keys()).filter((c) => broken.has(c)).length;
  const ore = found === null ? null : game.ores[found];

  if (game.ores.length === 0) return null;

  return (
    <section
      id="mine"
      data-biome="cave"
      className="relative z-10 mx-auto max-w-6xl px-4 py-24"
    >
      <header className="mb-8 text-center" data-reveal="0">
        <p
          className="mc-out mb-3 text-[color:var(--gold)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          THE MINE
        </p>
        <h2
          className="mc-out-lg text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 'clamp(16px,3vw,26px)', lineHeight: 1.4 }}
        >
          Dig for the Numbers
        </h2>
        <p className="mc-out mt-3 text-[20px] text-white/80">
          Every ore in this wall is a real result. Break blocks to find them.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <Panel
          title="Stone Wall"
          subtitle={`${foundCount} of ${game.ores.length} ores uncovered`}
        >
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: total }, (_, cell) => {
              const isBroken = broken.has(cell);
              const oreIndex = oreAt.get(cell);
              const hasOre = oreIndex !== undefined;
              return (
                <button
                  key={cell}
                  type="button"
                  onClick={() => mine(cell)}
                  aria-label={
                    isBroken
                      ? hasOre
                        ? `${game.ores[oreIndex].material}: ${game.ores[oreIndex].value}`
                        : 'Empty stone, mined'
                      : `Mine block ${cell + 1}`
                  }
                  className="mc-slot mc-slot-hover grid aspect-square place-items-center"
                  style={
                    isBroken
                      ? {
                          background: hasOre ? '#2a2a30' : '#141418',
                          boxShadow: 'inset 3px 3px 0 rgba(0,0,0,.6), inset -3px -3px 0 rgba(255,255,255,.08)',
                        }
                      : undefined
                  }
                >
                  {isBroken && hasOre && <Item src={game.ores[oreIndex].icon} size={28} />}
                  {!isBroken && (
                    <span
                      aria-hidden
                      className="block h-full w-full"
                      style={{
                        background: "url('/tex/stone.png') center / cover",
                        imageRendering: 'pixelated',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={revealAll} className="mc-btn mt-5 w-full px-4 py-3 text-[9px]">
            Reveal every ore
          </button>
        </Panel>

        <div
          className="h-fit border-[3px] border-black p-5"
          style={{
            background: '#141018',
            boxShadow: 'inset 0 0 0 2px #26202e, 10px 10px 0 rgba(0,0,0,.35)',
          }}
          aria-live="polite"
        >
          {ore ? (
            <>
              <div className="flex items-center gap-3">
                <Item src={ore.icon} size={36} />
                <p style={{ fontFamily: 'var(--px)', fontSize: 8, color: ore.color, lineHeight: 2 }}>
                  {ore.material} Ore
                </p>
              </div>
              <p
                className="mc-out mt-3 text-white"
                style={{ fontFamily: 'var(--px)', fontSize: 22, lineHeight: 1.4 }}
              >
                {ore.value}
              </p>
              <p className="no-break mt-3 text-[20px] leading-snug text-white/80">{ore.label}</p>
            </>
          ) : (
            <>
              <p
                className="text-white/60"
                style={{ fontFamily: 'var(--px)', fontSize: 8, lineHeight: 2 }}
              >
                Nothing mined yet
              </p>
              <p className="no-break mt-3 text-[20px] leading-snug text-white/70">
                Pick a block. Six ores are buried in this wall, and each one is a number
                worth knowing.
              </p>
            </>
          )}

          <ul className="mt-5 grid gap-2 border-t-2 border-white/10 pt-4">
            {game.ores.map((o, i) => {
              const uncovered = Array.from(oreAt.entries()).some(
                ([cell, idx]) => idx === i && broken.has(cell),
              );
              return (
                <li key={o.label} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0"
                    style={{ background: uncovered ? o.color : '#3a3a42' }}
                  />
                  <span className="truncate text-[18px] text-white/70">
                    {uncovered ? `${o.value} — ${o.material}` : 'Undiscovered'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
