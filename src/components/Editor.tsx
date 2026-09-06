import { useState } from 'react';
import { usePortfolio, saveOverride, clearOverride, basePortfolio } from '../hooks/usePortfolio';
import { Panel } from './mc/Gui';
import type { Portfolio } from '../types/portfolio';

/**
 * The stats editor, served at /edit.
 *
 * Everything on this page is content I wrote as a placeholder and JasMehr
 * should own. Edits save to localStorage, so the site reflects them straight
 * away on this browser; "Download portfolio.json" produces the file to drop
 * into src/data/ to make them real for everyone.
 *
 * It is deliberately not a CMS. There is no server and no auth, so a draft
 * here is local to this browser and cannot leak into the deployed site.
 */
export default function Editor() {
  const current = usePortfolio();
  const [draft, setDraft] = useState<Portfolio>(() => structuredClone(current));
  const [saved, setSaved] = useState(false);

  const set = (fn: (d: Portfolio) => void) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setSaved(false);
  };

  const apply = () => {
    saveOverride(draft);
    setSaved(true);
  };

  const reset = () => {
    clearOverride();
    setDraft(structuredClone(basePortfolio()));
    setSaved(false);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="relative z-10 mx-auto max-w-4xl px-4 py-16">
      <header className="mb-8">
        <p
          className="mc-out mb-3 text-[color:var(--gold)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          OPTIONS
        </p>
        <h1
          className="mc-out-lg text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 'clamp(16px,3vw,26px)', lineHeight: 1.4 }}
        >
          Edit Your Stats
        </h1>
        <p className="mc-out mt-3 text-[20px] leading-snug text-white/80">
          Changes save to this browser instantly. To make them permanent, download the file and
          replace <code>src/data/portfolio.json</code>.
        </p>
      </header>

      <div className="grid gap-6">
        <Panel title="Player">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Class"
              value={draft.game.className}
              onChange={(v) => set((d) => void (d.game.className = v))}
            />
            <Field
              label="Status"
              value={draft.game.status}
              onChange={(v) => set((d) => void (d.game.status = v))}
            />
            <Field
              label="Stat label"
              value={draft.game.levelLabel}
              onChange={(v) => set((d) => void (d.game.levelLabel = v))}
            />
            <Field
              label="Experience"
              value={draft.profile.yearsOfExperience}
              onChange={(v) => set((d) => void (d.profile.yearsOfExperience = v))}
            />
            <Field
              label="Spawn"
              value={draft.game.spawn}
              onChange={(v) => set((d) => void (d.game.spawn = v))}
            />
            <Field
              label="Tagline"
              value={draft.profile.tagline}
              onChange={(v) => set((d) => void (d.profile.tagline = v))}
            />
            <NumberField
              label="Hearts (0-10)"
              value={draft.game.hearts}
              min={0}
              max={10}
              onChange={(n) => set((d) => void (d.game.hearts = n))}
            />
            <NumberField
              label="Level number"
              value={draft.game.level}
              min={0}
              max={999}
              onChange={(n) => set((d) => void (d.game.level = n))}
            />
          </div>
        </Panel>

        <Panel title="Splash text" subtitle="One is picked at random each load.">
          <div className="grid gap-2">
            {draft.game.splashes.map((s, i) => (
              <Field
                key={i}
                label={`Splash ${i + 1}`}
                value={s}
                onChange={(v) => set((d) => void (d.game.splashes[i] = v))}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Enchantment levels" subtitle="1 to 5, shown as roman numerals.">
          <div className="grid gap-5">
            {draft.skills.categories.map((c, ci) => (
              <div key={c.name}>
                <p
                  className="mb-2 text-[color:var(--ink-soft)]"
                  style={{ fontFamily: 'var(--px)', fontSize: 8 }}
                >
                  {c.name}
                </p>
                <div className="grid gap-2">
                  {c.items.map((s, si) => (
                    <div key={s.name} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3">
                      <Field
                        label=""
                        value={s.name}
                        onChange={(v) => set((d) => void (d.skills.categories[ci].items[si].name = v))}
                      />
                      <NumberField
                        label=""
                        value={s.level}
                        min={1}
                        max={5}
                        onChange={(n) => set((d) => void (d.skills.categories[ci].items[si].level = n))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Buried numbers" subtitle="The stats hidden in the mine.">
          <div className="grid gap-4">
            {draft.game.ores.map((o, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
                <Field
                  label="Value"
                  value={o.value}
                  onChange={(v) => set((d) => void (d.game.ores[i].value = v))}
                />
                <Field
                  label="Label"
                  value={o.label}
                  onChange={(v) => set((d) => void (d.game.ores[i].label = v))}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Bio">
          <textarea
            value={draft.profile.bio}
            onChange={(e) => set((d) => void (d.profile.bio = e.target.value))}
            rows={5}
            className="w-full border-2 border-black bg-white/80 p-3 text-[19px] leading-snug text-[color:var(--ink)]"
          />
        </Panel>
      </div>

      <div className="sticky bottom-4 mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={apply} className="mc-btn px-5 py-3 text-[10px]">
          {saved ? 'Saved to this browser' : 'Apply to site'}
        </button>
        <button type="button" onClick={download} className="mc-btn px-5 py-3 text-[10px]">
          Download portfolio.json
        </button>
        <button type="button" onClick={reset} className="mc-btn px-5 py-3 text-[10px]">
          Reset to file
        </button>
        <a href="/" className="mc-btn px-5 py-3 text-[10px]">
          Back to site
        </a>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1">
      {label && (
        <span
          className="text-[color:var(--ink-soft)]"
          style={{ fontFamily: 'var(--px)', fontSize: 7 }}
        >
          {label}
        </span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-2 border-black bg-white/80 px-3 py-2 text-[19px] leading-tight text-[color:var(--ink)]"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="grid gap-1">
      {label && (
        <span
          className="text-[color:var(--ink-soft)]"
          style={{ fontFamily: 'var(--px)', fontSize: 7 }}
        >
          {label}
        </span>
      )}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="border-2 border-black bg-white/80 px-3 py-2 text-[19px] leading-tight text-[color:var(--ink)]"
      />
    </label>
  );
}
