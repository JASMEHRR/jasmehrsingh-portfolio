import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { ArrowDown, ArrowUp, Lock, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import type { Portfolio } from '../types/portfolio';
import { merge, publish, unlock, useLiveContent, type Overrides, type Section } from './liveContent';
import {
  blankItemIn,
  blankLike,
  CARDS,
  clone,
  Ctx,
  HIDDEN,
  label,
  LONG,
  same,
  titleOf,
  useEdit,
  type CardName,
  type EditApi,
  type Json,
} from './editContext';

/**
 * Editing the live site, the way a profile is edited: a pencil on each part
 * of the page, a form for that part, and one Publish when everything reads
 * right.
 *
 * It is hidden. Nothing appears until the reader asks for it, by triple
 * clicking a row of skill blocks or opening the page at /#edit, and then
 * proves who they are with the site's password (see liveContent.ts). Without
 * the password the prompt can change nothing: the server is what checks it.
 *
 * Forms are built from the content itself rather than written out field by
 * field, so a new field in portfolio.json is editable the day it is added.
 */

function Text({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const colour = name === 'color' || /^#[0-9a-f]{3,8}$/i.test(value);
  const kind = name === 'email' ? 'email' : name === 'phone' ? 'tel' : /^https?:/.test(value) ? 'url' : 'text';
  if (colour) {
    return (
      <span className="flex gap-2">
        <input
          type="color"
          className="g-input h-11 w-14 p-1"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#8b6cff'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label(name)}, colour picker`}
        />
        <input className="g-input min-w-0 flex-1" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    );
  }
  if (LONG.has(name) || value.length > 90) {
    return (
      <textarea className="g-input min-h-[6rem]" value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  return <input className="g-input" type={kind} value={value} onChange={(e) => onChange(e.target.value)} />;
}

/**
 * A number that can be emptied while it is being retyped.
 *
 * Reading the box straight into a number turned an empty box into 0, so
 * clearing it to type a new figure left a 0 in the way. The text being typed
 * is kept here, and only a real number is passed on.
 */
function NumberField({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const level = name === 'level';
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[color:var(--g-faint)]">{label(name)}</span>
      <input
        className="g-input"
        type="number"
        value={text}
        min={level ? 1 : undefined}
        max={level ? 5 : undefined}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value.trim() === '' || !Number.isFinite(n)) return;
          // a skill shows five blocks and nothing else, so its level stays inside them
          onChange(level ? Math.min(5, Math.max(1, Math.round(n))) : n);
        }}
        onBlur={() => setText(String(value))}
      />
    </label>
  );
}

function Field({
  name,
  value,
  template,
  onChange,
}: {
  name: string;
  value: unknown;
  template: unknown;
  onChange: (v: unknown) => void;
}) {
  if (typeof value === 'boolean') {
    return (
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        <span>{label(name)}</span>
      </label>
    );
  }
  if (typeof value === 'number') {
    return <NumberField name={name} value={value} onChange={onChange} />;
  }
  if (typeof value === 'string') {
    return (
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[color:var(--g-faint)]">{label(name)}</span>
        <Text name={name} value={value} onChange={onChange} />
      </label>
    );
  }
  if (Array.isArray(value)) {
    return <List name={name} items={value} template={template} onChange={onChange} />;
  }
  if (value && typeof value === 'object') {
    return (
      <fieldset className="rounded-2xl border border-white/12 p-4">
        <legend className="px-1 text-sm text-[color:var(--g-faint)]">{label(name)}</legend>
        <Group value={value as Json} template={template} onChange={(v) => onChange(v)} />
      </fieldset>
    );
  }
  return null;
}

function Group({
  value,
  template,
  onChange,
  only,
}: {
  value: Json;
  template: unknown;
  onChange: (v: Json) => void;
  only?: string[];
}) {
  const keys = (only ?? Object.keys(value)).filter((k) => !HIDDEN.has(k) && k in value);
  const shape = (template ?? {}) as Json;
  return (
    <div className="flex flex-col gap-4">
      {keys.map((k) => (
        <Field
          key={k}
          name={k}
          value={value[k]}
          template={shape[k]}
          onChange={(v) => onChange({ ...value, [k]: v })}
        />
      ))}
    </div>
  );
}

function List({
  name,
  items,
  template,
  onChange,
}: {
  name: string;
  items: unknown[];
  template: unknown;
  onChange: (v: unknown[]) => void;
}) {
  const set = (i: number, v: unknown) => onChange(items.map((old, n) => (n === i ? v : old)));
  const remove = (i: number) => onChange(items.filter((_, n) => n !== i));
  const move = (i: number, by: number) => {
    const to = i + by;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };
  // An emptied list has nothing to copy, so the file's own item is the
  // pattern. Without it, emptying the projects and adding one put a bare
  // piece of text where a project belongs, which the page cannot draw.
  const pattern = items.length > 0 ? items[items.length - 1] : (template as unknown[] | undefined)?.[0];
  const add = () => onChange([...items, pattern === undefined ? '' : blankLike(pattern)]);
  const sample = items.length > 0 ? items[0] : pattern;
  const simple = typeof sample === 'string' || typeof sample === 'number';

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-[color:var(--g-faint)]">{label(name)}</span>
      {simple
        ? items.map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              <input
                className="g-input min-w-0 flex-1"
                value={String(item)}
                aria-label={`${label(name)} ${i + 1}`}
                onChange={(e) => set(i, typeof item === 'number' ? Number(e.target.value) || 0 : e.target.value)}
              />
              <IconButton title={`Remove ${label(name)} ${i + 1}`} onClick={() => remove(i)}>
                <Trash2 size={15} aria-hidden />
              </IconButton>
            </span>
          ))
        : items.map((item, i) => (
            <div key={i} className="rounded-2xl border border-white/12 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="g-display truncate font-semibold">{titleOf(item, i)}</p>
                <span className="flex shrink-0 gap-1">
                  <IconButton title="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp size={15} aria-hidden />
                  </IconButton>
                  <IconButton title="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                    <ArrowDown size={15} aria-hidden />
                  </IconButton>
                  <IconButton title={`Remove ${titleOf(item, i)}`} onClick={() => remove(i)}>
                    <Trash2 size={15} aria-hidden />
                  </IconButton>
                </span>
              </div>
              {item && typeof item === 'object' ? (
                <Group
                  value={item as Json}
                  template={(template as unknown[] | undefined)?.[0] ?? items[0]}
                  onChange={(v) => set(i, v)}
                />
              ) : null}
            </div>
          ))}
      <div>
        <button type="button" onClick={add} className="glass glass-pill inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium">
          <Plus size={15} aria-hidden /> Add
        </button>
      </div>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="relative grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[color:var(--g-soft)] hover:bg-white/20 hover:text-[color:var(--g-ink)] disabled:opacity-35"
    >
      {children}
      <span className="sr-only">{title}</span>
    </button>
  );
}

/** The pencil beside a part of the page. Nothing at all until the site is unlocked. */
export function EditPencil({ card }: { card: CardName }) {
  const edit = useEdit();
  if (!edit?.editing) return null;
  return (
    <button
      type="button"
      onClick={() => edit.openCard(card)}
      title={`Edit ${CARDS[card].title.toLowerCase()}`}
      className="glass glass-pill relative ml-3 inline-grid h-9 w-9 shrink-0 translate-y-[-2px] place-items-center align-middle"
    >
      <Pencil size={15} aria-hidden />
      <span className="sr-only">Edit {CARDS[card].title.toLowerCase()}</span>
    </button>
  );
}

/**
 * Holds the content the page renders, and everything the editor needs.
 *
 * `children` is given the content to render: the committed file, with any
 * published sections over it, and any unpublished edits over those, so the
 * page always shows what Publish would put live.
 */
export default function EditProvider({
  base,
  children,
}: {
  base: Portfolio;
  children: (content: Portfolio) => ReactNode;
}) {
  const [live, setLive] = useLiveContent(base);
  const [draft, setDraft] = useState<Overrides>({});
  const [password, setPassword] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [card, setCard] = useState<CardName | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const login = useRef<HTMLDialogElement>(null);

  // What is published, with the unpublished edits over it. A null in the
  // draft means "back to the file", so it takes the section away rather than
  // laying an empty one over it. It keeps its identity until the content
  // really changes, which is what the rest of this hangs its work on.
  const overrides: Overrides = useMemo(() => {
    const out: Overrides = { ...live };
    for (const [name, value] of Object.entries(draft)) {
      if (value === null) delete out[name as Section];
      else out[name as Section] = value;
    }
    return out;
  }, [live, draft]);
  const content = useMemo(() => merge(base, overrides), [base, overrides]);
  const changed = Object.keys(draft);

  const api: EditApi = useMemo(
    () => ({
      editing,
      // an edit can add a card or a row, and those arrive hidden until the
      // reveal and the lens are told to look at the page again
      revision: overrides,
      start: () => {
        if (password) {
          setEditing(true);
          setStatus('');
        } else if (login.current && !login.current.open) {
          setLoginError('');
          login.current.querySelector('form')?.reset();
          login.current.showModal();
        }
      },
      openCard: (c: CardName) => setCard(c),
      section: (name: Section) => (name in overrides ? overrides[name] : (base as unknown as Json)[name]),
      setSection: (name: Section, value: unknown) => {
        // a fresh edit means the last word about publishing is out of date
        setStatus('');
        setDraft((d) => {
          const next = { ...d };
          const published = name in live ? live[name] : undefined;
          if (same(value, (base as unknown as Json)[name])) {
            // back to the committed file: the stored copy is dropped rather
            // than replaced with an identical one, so later changes to the
            // file reach the site again
            if (published === undefined) delete next[name];
            else next[name] = null;
          } else if (same(value, published)) {
            // already published: not a change
            delete next[name];
          } else {
            next[name] = value;
          }
          return next;
        });
      },
    }),
    // rebuilt only when what it closes over changes, so a keystroke in a
    // form does not re-render every pencil on the page
    [editing, password, base, live, overrides],
  );

  // /#edit opens it too, for a phone, where a triple tap is unreliable
  const startRef = useRef(api.start);
  useEffect(() => {
    startRef.current = api.start;
  });
  useEffect(() => {
    const check = () => {
      if (window.location.hash !== '#edit') return;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      startRef.current();
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  // nothing unpublished is lost to a closed tab without a word about it
  useEffect(() => {
    if (changed.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length]);

  const onUnlock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const pw = new FormData(form).get('password');
    if (typeof pw !== 'string' || pw === '') return;
    setBusy(true);
    const r = await unlock(base, pw);
    setBusy(false);
    if (r.result === 'ok') {
      // start from what is published now, as the unlock returned it, rather
      // than from this page's copy, which is missing if the first fetch failed
      setLive(r.content);
      setPassword(pw);
      setEditing(true);
      setStatus('');
      form.reset();
      login.current?.close();
    } else {
      setLoginError(
        r.result === 'wrong-password'
          ? 'That password is not right.'
          : r.result === 'stale'
            ? 'This page is older than the site. Reload it and try again.'
            : 'Could not reach the site. Try again.',
      );
    }
  };

  const publishAll = async () => {
    if (!password || changed.length === 0) return;
    // an item with no title of any kind would be an empty card on the page,
    // and the page hides it, so it would simply vanish without explanation
    const blank = blankItemIn(draft as Record<string, unknown>);
    if (blank) {
      setStatus(`One ${blank} entry has no title yet. Fill it in or remove it.`);
      return;
    }
    setBusy(true);
    const r = await publish(base, password, draft);
    setBusy(false);
    if (r.result === 'ok') {
      setLive(r.content);
      setDraft({});
      setStatus('Published. Live for everyone now.');
    } else if (r.result === 'wrong-password') {
      setPassword(null);
      setStatus('The password has changed. Leave and unlock again.');
    } else if (r.result === 'stale') {
      setStatus('This page is older than the site. Reload to edit again, which loses what is unpublished here.');
    } else {
      setStatus(r.error ?? 'Could not publish. Try again.');
    }
  };

  const leave = () => {
    if (changed.length > 0 && !window.confirm('Leave without publishing? The changes on screen will be lost.')) return;
    setDraft({});
    setEditing(false);
    setStatus('');
  };

  return (
    <Ctx.Provider value={api}>
      {children(content)}

      <dialog
        ref={login}
        className="g-dialog glass p-7"
        aria-labelledby="edit-login-title"
        onClose={(e) => e.currentTarget.querySelector('form')?.reset()}
      >
        <form onSubmit={onUnlock} className="flex flex-col gap-4">
          {/* lets a password manager save and fill the password; not shown */}
          <input type="text" name="username" autoComplete="username" defaultValue="portfolio editor" readOnly tabIndex={-1} className="sr-only" />
          <h2 id="edit-login-title" className="g-display flex items-center gap-2 text-2xl font-bold">
            <Lock size={20} aria-hidden /> Edit this site
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
            <button type="button" onClick={() => login.current?.close()} className="rounded-full px-4 py-2 text-sm text-[color:var(--g-soft)] hover:text-[color:var(--g-ink)]">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="glass glass-pill px-5 py-2 text-sm font-semibold">
              {busy ? 'Checking' : 'Unlock'}
            </button>
          </div>
        </form>
      </dialog>

      {card && (
        <CardDialog
          key={card}
          card={card}
          api={api}
          base={base}
          onClose={() => setCard(null)}
        />
      )}

      {editing && (
        <div
          role="region"
          aria-label="Site editor"
          className="glass fixed bottom-5 left-1/2 z-[65] flex w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-[26px] py-2 pl-5 pr-2 text-sm"
        >
          <span aria-live="polite" className="min-w-0 flex-1">
            {status ||
              (changed.length > 0
                ? `${changed.length} section${changed.length === 1 ? '' : 's'} changed, not published`
                : 'Click a pencil to edit a part of the page')}
          </span>
          <button
            type="button"
            onClick={publishAll}
            disabled={changed.length === 0 || busy || !password}
            className="glass glass-pill shrink-0 px-4 py-1.5 font-semibold disabled:opacity-50"
          >
            {busy ? 'Publishing' : 'Publish'}
          </button>
          <button type="button" onClick={leave} className="shrink-0 rounded-full px-3 py-1.5 text-[color:var(--g-soft)] hover:text-[color:var(--g-ink)]">
            Done
          </button>
        </div>
      )}
    </Ctx.Provider>
  );
}

/**
 * The form for one pencil.
 *
 * It works on its own copy, so Cancel really does leave the page as it was,
 * and Apply hands the whole edited section back. Publish, in the bar, is
 * what puts it in front of visitors.
 */
function CardDialog({
  card,
  api,
  base,
  onClose,
}: {
  card: CardName;
  api: EditApi;
  base: Portfolio;
  onClose: () => void;
}) {
  const spec = CARDS[card];
  const dialog = useRef<HTMLDialogElement>(null);
  const [working, setWorking] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const part of spec.parts) out[part.section] = clone(api.section(part.section));
    return out;
  });

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  // Both buttons close the form themselves rather than waiting for the
  // dialog's close event: the form holds its own working copy, and it has to
  // be thrown away for certain, or reopening would show the old edits again.
  const close = () => {
    dialog.current?.close();
    onClose();
  };

  const apply = () => {
    for (const part of spec.parts) api.setSection(part.section, working[part.section]);
    close();
  };

  const toOriginal = () => {
    const out: Record<string, unknown> = {};
    for (const part of spec.parts) out[part.section] = clone((base as unknown as Json)[part.section]);
    setWorking(out);
  };

  return (
    <dialog ref={dialog} className="g-dialog g-dialog-wide glass p-0" aria-labelledby="edit-card-title" onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/12 px-6 py-4">
          <h2 id="edit-card-title" className="g-display text-xl font-bold">
            {spec.title}
          </h2>
          <button type="button" onClick={toOriginal} title="Put this part back to the site's original wording" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[color:var(--g-soft)] hover:text-[color:var(--g-ink)]">
            <Undo2 size={15} aria-hidden /> Original
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-6 py-5">
          {spec.parts.map((part) => {
            const value = working[part.section];
            const template = (base as unknown as Json)[part.section];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              return (
                <Group
                  key={part.section}
                  value={value as Json}
                  template={template}
                  only={part.keys}
                  onChange={(v) => setWorking((w) => ({ ...w, [part.section]: v }))}
                />
              );
            }
            return (
              <List
                key={part.section}
                name={part.section}
                items={Array.isArray(value) ? value : []}
                template={template}
                onChange={(v) => setWorking((w) => ({ ...w, [part.section]: v }))}
              />
            );
          })}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-white/12 px-6 py-4">
          <button type="button" onClick={close} className="rounded-full px-4 py-2 text-sm text-[color:var(--g-soft)] hover:text-[color:var(--g-ink)]">
            Cancel
          </button>
          <button type="button" onClick={apply} className="glass glass-pill px-5 py-2 text-sm font-semibold">
            Apply
          </button>
        </div>
      </div>
    </dialog>
  );
}
