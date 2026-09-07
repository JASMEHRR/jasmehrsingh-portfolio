import { useEffect, useState } from 'react';

/** Districts, named as a coordinate readout would name them. */
const BIOME_LABEL: Record<string, string> = {
  overworld: 'Town Square',
  enchant: 'Library Quarter',
  craft: 'Workshop Row',
  cave: 'Market',
  cherry: 'Gardens',
  night: 'Docks',
};

/**
 * A deliberately quiet HUD: coordinates on the left, biome and depth bar on
 * the right.
 *
 * The hearts used to live here and made the top of the page look busy without
 * saying anything — health is a decorative stat, so it belongs in the profile
 * panel where it is read once, not pinned over every section. What stays is
 * the one readout that earns its place: the bar doubles as scroll progress.
 */
export default function Hud() {
  const [progress, setProgress] = useState(0);
  const [biome, setBiome] = useState('overworld');
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
      setDepth(Math.round(window.scrollY / 16));
      setBiome(document.documentElement.dataset.biome ?? 'overworld');
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-4 px-4 py-3"
    >
      <p
        className="mc-out text-white/75"
        style={{ fontFamily: 'var(--px)', fontSize: 7, lineHeight: 1.8 }}
      >
        XYZ: 0 / {64 - depth} / 0
      </p>

      <div className="grid w-[min(200px,40vw)] justify-items-end gap-1">
        <p
          className="mc-out text-white/75"
          style={{ fontFamily: 'var(--px)', fontSize: 7, lineHeight: 1.8 }}
        >
          {BIOME_LABEL[biome] ?? biome}
        </p>
        <div className="mc-xp w-full">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
