import { usePortfolio } from '../hooks/usePortfolio';
import { Panel, Slot, Block } from './mc/Gui';

const INGREDIENT_COLORS = ['#8a6032', '#4caf3f', '#4fc3f7', '#ffd83d', '#b06cf7', '#d8a37a'];

/**
 * Experience as crafting recipes.
 *
 * Each role is a 3x3 grid whose filled slots are that job's highlights, with
 * the arrow pointing at the result: the company and title. It reads as a
 * recipe book, and the number of filled slots genuinely reflects how much
 * went into each role rather than being decorative.
 */
export default function CraftingJourney() {
  const { experience } = usePortfolio();
  if (experience.length === 0) return null;

  return (
    <section
      id="experience"
      data-biome="craft"
      className="relative z-10 mx-auto max-w-6xl px-4 py-24"
    >
      <header className="mb-8 text-center" data-reveal="0">
        <p
          className="mc-out mb-3 text-[color:var(--gold)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          CRAFTING TABLE
        </p>
        <h2
          className="mc-out-lg text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 'clamp(16px,3vw,26px)', lineHeight: 1.4 }}
        >
          What I&apos;ve Crafted
        </h2>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {experience.map((job, i) => (
          <Panel key={`${job.company}-${job.period}`}>
            <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
              {/* the 3x3 recipe grid */}
              <div className="shrink-0">
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }, (_, slot) => {
                    const filled = slot < job.highlights.length;
                    return (
                      <Slot key={slot} className="h-11 w-11">
                        {filled && (
                          <Block
                            color={INGREDIENT_COLORS[(i + slot) % INGREDIENT_COLORS.length]}
                            size={22}
                          />
                        )}
                      </Slot>
                    );
                  })}
                </div>
                <p
                  className="mt-2 text-center text-[color:var(--ink-soft)]"
                  style={{ fontFamily: 'var(--px)', fontSize: 7 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </p>
              </div>

              {/* the result */}
              <div>
                <h3 className="no-break text-[22px] leading-tight text-[color:var(--ink)]">
                  {job.role}
                </h3>
                <p className="no-break mt-1 text-[20px] leading-tight text-[color:var(--ink-soft)]">
                  {job.company}
                </p>
                <p
                  className="mt-2 inline-block border-2 border-black/30 bg-black/10 px-2 py-1 text-[color:var(--ink)]"
                  style={{ fontFamily: 'var(--px)', fontSize: 7 }}
                >
                  {job.period}
                </p>
                <p className="no-break mt-3 text-[19px] leading-snug text-[color:var(--ink)]">
                  {job.summary}
                </p>
              </div>
            </div>

            <ul className="mt-5 grid gap-2 border-t-2 border-black/20 pt-4">
              {job.highlights.map((h) => (
                <li
                  key={h}
                  className="no-break relative pl-5 text-[19px] leading-snug text-[color:var(--ink)]"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-[9px] h-2 w-2"
                    style={{ background: 'var(--ench-ink)' }}
                  />
                  {h}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </section>
  );
}
