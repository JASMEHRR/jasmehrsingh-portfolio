import { useEffect, useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { Hearts } from './mc/Gui';

const BIOME_LABEL: Record<string, string> = {
  overworld: 'Plains',
  enchant: 'Stronghold',
  craft: 'Workshop',
  cave: 'Deepslate Cave',
  cherry: 'Cherry Grove',
  night: 'Plains — Night',
};

/**
 * The fixed game HUD.
 *
 * Left is the player's condition, right is the world readout. The XP bar
 * doubles as a scroll progress indicator, which is the one place where the
 * game metaphor and a genuinely useful control happen to be the same thing.
 */
export default function Hud() {
  const { game } = usePortfolio();
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

  // Y counts down as you descend, the way a real coordinate readout would
  const y = 64 - depth;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-4 px-4 py-3"
    >
      <div className="grid gap-2">
        <Hearts count={game.hearts} />
        <p
          className="mc-out text-white/85"
          style={{ fontFamily: 'var(--px)', fontSize: 7, lineHeight: 1.8 }}
        >
          XYZ: 0 / {y} / 0
        </p>
      </div>

      <div className="grid w-[min(240px,42vw)] gap-1 justify-items-end">
        <p
          className="mc-out text-[color:var(--xp)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          {game.level}
        </p>
        <div className="mc-xp w-full">
          <i style={{ width: `${progress}%` }} />
        </div>
        <p
          className="mc-out mt-1 text-white/85"
          style={{ fontFamily: 'var(--px)', fontSize: 7, lineHeight: 1.8 }}
        >
          {BIOME_LABEL[biome] ?? biome}
        </p>
      </div>
    </div>
  );
}
