import { useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { Panel, EnchantRow } from './mc/Gui';

/**
 * Skills as an enchanting table.
 *
 * Left is the lapis-and-book side with a category picker; right is the
 * enchantment list for whichever category is selected. Picking a category
 * swaps the list rather than scrolling, which keeps every skill one click away.
 */
export default function EnchantSkills() {
  const { skills } = usePortfolio();
  const [active, setActive] = useState(0);
  const category = skills.categories[active];

  if (skills.categories.length === 0) return null;

  return (
    <section
      id="skills"
      data-biome="enchant"
      className="relative z-10 mx-auto max-w-6xl px-4 py-24"
    >
      <header className="mb-8 text-center" data-reveal="0">
        <p
          className="mc-out mb-3 text-[color:var(--ench)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          ENCHANTING TABLE
        </p>
        <h2
          className="mc-out-lg text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 'clamp(16px,3vw,26px)', lineHeight: 1.4 }}
        >
          Skills &amp; Enchantments
        </h2>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* ---- the book: pick what to enchant ---- */}
        <Panel title="Bookshelves">
          <ul className="grid gap-2" role="tablist" aria-label="Skill categories">
            {skills.categories.map((c, i) => (
              <li key={c.name}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-controls="enchant-list"
                  onClick={() => setActive(i)}
                  className="mc-btn w-full px-3 py-3 text-left text-[9px] leading-relaxed"
                  style={
                    i === active
                      ? { background: '#5b467d', boxShadow: 'inset 3px 3px 0 #8b6fb5, inset -3px -3px 0 #33234a' }
                      : undefined
                  }
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[18px] leading-snug text-[color:var(--ink-soft)]">
            {skills.categories.reduce((n, c) => n + c.items.length, 0)} enchantments known across{' '}
            {skills.categories.length} bookshelves.
          </p>
        </Panel>

        {/* ---- the enchantment list ---- */}
        <Panel title={category.name} subtitle="Levels are self-assessed, not certifications.">
          <ul id="enchant-list" className="grid gap-4" role="tabpanel" aria-live="polite">
            {category.items.map((s) => (
              <EnchantRow key={s.name} name={s.name} level={s.level} />
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  );
}
