import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import type { SkillCategory } from '../types/portfolio';
import { applyLevels, saveLevels, unlock, useLiveLevels, type Levels } from './skillEdits';

const BLOCKS = [1, 2, 3, 4, 5];

function levelsOf(categories: SkillCategory[]): Levels {
  return Object.fromEntries(categories.flatMap((c) => c.items.map((s) => [s.name, s.level])));
}

function blockFill(filled: boolean): string {
  return filled ? 'linear-gradient(90deg, var(--g-cyan), var(--g-violet))' : 'rgba(255,255,255,.12)';
}

/**
 * The skill cards, with a hidden editor for the levels.
 *
 * Triple-click any row of level blocks, or open the page at /#edit, and a
 * password prompt appears. Once unlocked, every block is a button: click a
 * skill's third block and it is level 3. Save sends the levels to the site,
 * and every visitor sees them from then on (see skillEdits.ts). Nothing of
 * this shows to a visitor, and without the password the prompt can change
 * nothing.
 */
export default function Skills({ categories }: { categories: SkillCategory[] }) {
  const [live, setLive] = useLiveLevels();
  const [password, setPassword] = useState<string | null>(null);
  // every skill's level while editing, or null when not editing
  const [draft, setDraft] = useState<Levels | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  const fileLevels = levelsOf(categories);
  const savedLevels = levelsOf(applyLevels(categories, live));
  const shown = applyLevels(categories, draft ?? live);
  const changes = draft ? Object.keys(draft).filter((n) => draft[n] !== savedLevels[n]).length : 0;

  const openEditor = () => {
    if (draft) return;
    if (password) {
      setDraft(savedLevels);
      setStatus('');
    } else if (dialog.current && !dialog.current.open) {
      setLoginError('');
      // nothing typed last time is still sitting in it
      dialog.current.querySelector('form')?.reset();
      dialog.current.showModal();
    }
  };

  // /#edit opens it too, for a phone, where a triple tap is unreliable
  const openRef = useRef(openEditor);
  useEffect(() => {
    openRef.current = openEditor;
  });
  useEffect(() => {
    const check = () => {
      if (window.location.hash !== '#edit') return;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      openRef.current();
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  const onUnlock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const pw = new FormData(form).get('password');
    if (typeof pw !== 'string' || pw === '') return;
    setBusy(true);
    const r = await unlock(pw);
    setBusy(false);
    if (r.result === 'ok') {
      // start from what is stored now, as the unlock returned it, not from
      // this page's copy, which is missing if the first fetch failed; saving
      // from that would have wiped every earlier edit
      setLive(r.levels);
      setPassword(pw);
      setDraft(levelsOf(applyLevels(categories, r.levels)));
      setStatus('');
      form.reset();
      dialog.current?.close();
    } else {
      setLoginError(r.result === 'wrong-password' ? 'That password is not right.' : 'Could not reach the site. Try again.');
    }
  };

  const save = async () => {
    if (!draft || !password) return;
    // only what differs from portfolio.json is stored, so putting a skill
    // back to its original level removes its edit rather than pinning it
    const edits = Object.fromEntries(Object.entries(draft).filter(([n, l]) => l !== fileLevels[n]));
    setBusy(true);
    const r = await saveLevels(password, edits);
    setBusy(false);
    if (r.result === 'ok') {
      setLive(r.levels);
      setStatus('Saved. Live for everyone now.');
    } else if (r.result === 'wrong-password') {
      // the password was changed on Netlify since unlocking
      setPassword(null);
      setStatus('The password has changed. Exit and unlock again.');
    } else {
      setStatus('Could not save. Try again.');
    }
  };

  const exit = () => {
    if (changes > 0 && !window.confirm('Discard the unsaved changes?')) return;
    setDraft(null);
    setStatus('');
  };

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {shown.map((cat, i) => (
          <div key={cat.name} className="glass reveal p-6 sm:p-7" style={{ '--d': `${(i % 2) * 90}ms` } as CSSProperties}>
            <h3 className="g-display text-xl font-semibold">{cat.name}</h3>
            <ul className="mt-5 space-y-3">
              {cat.items.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-4">
                  <span>{s.name}</span>
                  {draft ? (
                    <span className="flex gap-1" role="group" aria-label={`${s.name} level`}>
                      {BLOCKS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="g-block -my-1.5 py-1.5"
                          aria-label={`${s.name}, level ${n} of 5`}
                          aria-current={n === s.level ? 'true' : undefined}
                          onClick={() => {
                            // from the latest draft, not this render's, or
                            // quick clicks before a re-render would drop edits
                            setDraft((d) => d && { ...d, [s.name]: n });
                            setStatus('');
                          }}
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
                        if (e.detail === 3) openEditor();
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

      <dialog
        ref={dialog}
        className="g-dialog glass p-7"
        aria-labelledby="edit-title"
        // however it closes (Cancel, Escape), nothing typed stays in it
        onClose={(e) => e.currentTarget.querySelector('form')?.reset()}
      >
        <form onSubmit={onUnlock} className="flex flex-col gap-4">
          {/* lets a password manager save and fill the password; not shown */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            defaultValue="portfolio editor"
            readOnly
            tabIndex={-1}
            className="sr-only"
          />
          <h2 id="edit-title" className="g-display flex items-center gap-2 text-2xl font-bold">
            <Lock size={20} aria-hidden /> Edit skill levels
          </h2>
          <label className="flex flex-col gap-2 text-sm text-[color:var(--g-soft)]">
            Password
            <input name="password" type="password" autoComplete="current-password" required className="g-input" />
          </label>
          {loginError && (
            <p role="alert" className="text-sm text-[color:var(--g-pink)]">
              {loginError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-full px-4 py-2 text-sm text-[color:var(--g-soft)] hover:text-[color:var(--g-ink)]"
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="glass glass-pill px-5 py-2 text-sm font-semibold">
              {busy ? 'Checking' : 'Unlock'}
            </button>
          </div>
        </form>
      </dialog>

      {draft && (
        <div
          role="region"
          aria-label="Skill level editor"
          className="glass fixed bottom-5 left-1/2 z-[65] flex w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-[26px] py-2 pl-5 pr-2 text-sm"
        >
          <span aria-live="polite" className="min-w-0 flex-1">
            {status ||
              (changes > 0 ? `${changes} unsaved change${changes === 1 ? '' : 's'}` : 'Click a block to set a level')}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={changes === 0 || busy || !password}
            className="glass glass-pill shrink-0 px-4 py-1.5 font-semibold disabled:opacity-50"
          >
            {busy ? 'Saving' : 'Save'}
          </button>
          <button
            type="button"
            onClick={exit}
            className="shrink-0 rounded-full px-3 py-1.5 text-[color:var(--g-soft)] hover:text-[color:var(--g-ink)]"
          >
            Done
          </button>
        </div>
      )}
    </>
  );
}
