import { useEffect, useState } from 'react';

const KEY = 'character-motion';

/**
 * Opt-out switch for the character's idle animation.
 *
 * prefers-reduced-motion still governs everything tied to scrolling — the
 * camera travel, the reveals, the parallax — because that is the motion it
 * exists to prevent. This one gentle, self-contained loop defaults to on and
 * can be switched off here, so someone who wants the site calm can have it
 * without the preference silently removing a feature they came to see.
 */
export default function MotionToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // storage blocked; the default stands
    }
    const initial = saved !== 'off';
    setOn(initial);
    document.documentElement.dataset.motion = initial ? 'on' : 'off';
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    document.documentElement.dataset.motion = next ? 'on' : 'off';
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off');
    } catch {
      // not persisting is survivable; the toggle still works this session
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className="mc-btn fixed bottom-3 right-3 z-40 px-3 py-2 text-[8px]"
    >
      {on ? 'Motion: on' : 'Motion: off'}
    </button>
  );
}
