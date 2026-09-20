import type { CSSProperties } from 'react';
import type { Skills as SkillsData } from '../types/portfolio';
import { useEdit } from './editContext';

const BLOCKS = [1, 2, 3, 4, 5];

function blockFill(filled: boolean): string {
  return filled ? 'linear-gradient(90deg, var(--g-cyan), var(--g-violet))' : 'rgba(255,255,255,.12)';
}

/**
 * The skill cards, and the way into editing the site.
 *
 * A triple click on any row of level blocks asks for the password (see
 * EditMode.tsx). While editing, every block is a button: click a skill's
 * third block and it is level 3, which is quicker than the form the pencil
 * opens, and the pencil is still there for renaming and reordering.
 */
export default function Skills({ skills }: { skills: SkillsData }) {
  const edit = useEdit();
  const editing = edit?.editing ?? false;

  const setLevel = (ci: number, si: number, level: number) => {
    edit?.setSection('skills', {
      ...skills,
      categories: skills.categories.map((c, i) =>
        i !== ci ? c : { ...c, items: c.items.map((s, n) => (n !== si ? s : { ...s, level })) },
      ),
    });
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {skills.categories.map((cat, ci) => (
        <div key={`${ci}-${cat.name}`} className="glass reveal p-6 sm:p-7" style={{ '--d': `${(ci % 2) * 90}ms` } as CSSProperties}>
          <h3 className="g-display text-xl font-semibold">{cat.name}</h3>
          <ul className="mt-5 space-y-3">
            {cat.items.map((s, si) => (
              <li key={`${si}-${s.name}`} className="flex items-center justify-between gap-4">
                <span>{s.name}</span>
                {editing ? (
                  <span className="flex gap-1" role="group" aria-label={`${s.name} level`}>
                    {BLOCKS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="g-block -my-1.5 py-1.5"
                        aria-label={`${s.name}, level ${n} of 5`}
                        aria-current={n === s.level ? 'true' : undefined}
                        onClick={() => setLevel(ci, si, n)}
                      >
                        <span className="block h-2 w-5 rounded-full" style={{ background: blockFill(n <= s.level) }} />
                      </button>
                    ))}
                  </span>
                ) : (
                  // the hidden way in: a triple click on the blocks
                  <span
                    className="-my-2 flex select-none gap-1 py-2"
                    role="img"
                    aria-label={`${s.level} out of 5`}
                    onClick={(e) => {
                      if (e.detail === 3) edit?.start();
                    }}
                  >
                    {BLOCKS.map((n) => (
                      <span key={n} className="h-2 w-5 rounded-full" style={{ background: blockFill(n <= s.level) }} />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
