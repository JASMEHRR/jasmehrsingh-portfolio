import { usePortfolio } from '../hooks/usePortfolio';
import { Panel, Block } from './mc/Gui';

/**
 * Education as the advancements screen.
 *
 * Minecraft advancement toasts are a gold-bordered frame with an icon, a
 * heading and one line of detail. Each qualification maps onto that cleanly,
 * and the cherry-grove biome keeps this section visually distinct from the
 * cave above it.
 */
export default function Advancements() {
  const { education, services } = usePortfolio();
  if (education.length === 0 && services.length === 0) return null;

  return (
    <section
      id="about"
      data-biome="cherry"
      className="relative z-10 mx-auto max-w-6xl px-4 py-24"
    >
      <header className="mb-8 text-center" data-reveal="0">
        <p
          className="mc-out mb-3 text-[color:var(--gold)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          ADVANCEMENTS
        </p>
        <h2
          className="mc-out-lg text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 'clamp(16px,3vw,26px)', lineHeight: 1.4 }}
        >
          Unlocked So Far
        </h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {education.map((e) => (
          <div
            key={e.institution}
            className="border-[3px] p-4"
            style={{
              background: '#1c1408',
              borderColor: '#000',
              boxShadow: 'inset 0 0 0 2px var(--gold), 8px 8px 0 rgba(0,0,0,.35)',
            }}
          >
            <div className="flex items-start gap-3">
              <Block color="#ffd83d" size={26} />
              <div className="min-w-0">
                <p
                  className="text-[color:var(--gold)]"
                  style={{ fontFamily: 'var(--px)', fontSize: 8, lineHeight: 1.8 }}
                >
                  Advancement Made!
                </p>
                <h3 className="no-break mt-2 text-[21px] leading-tight text-white">{e.degree}</h3>
                <p className="no-break mt-1 text-[19px] leading-snug text-white/70">
                  {e.institution}
                </p>
                <p className="mt-2 text-[18px] text-white/55">
                  {e.period}
                  {e.result ? ` · ${e.result}` : ''}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length > 0 && (
        <div className="mt-8">
          <Panel title="Villager Trades" subtitle="What I can be hired to do.">
            <div className="grid gap-5 sm:grid-cols-2">
              {services.map((s, i) => (
                <article key={s.title} className="border-t-2 border-black/20 pt-4">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="text-[color:var(--ink-soft)]"
                      style={{ fontFamily: 'var(--px)', fontSize: 8 }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="no-break text-[21px] leading-tight text-[color:var(--ink)]">
                      {s.title}
                    </h3>
                  </div>
                  <p className="no-break mt-2 text-[19px] leading-snug text-[color:var(--ink)]">
                    {s.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="border-2 border-black/25 px-2 py-1 text-[color:var(--ink-soft)]"
                        style={{ fontFamily: 'var(--px)', fontSize: 7 }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </section>
  );
}
