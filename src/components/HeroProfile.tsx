import { useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePointer } from '../hooks/usePointer';
import { Panel, Hearts, XpBar } from './mc/Gui';

/**
 * The player screen.
 *
 * The character is the subject, not an accessory: it runs the full height of
 * the viewport on the right and overlaps the text column, so at any window
 * size it reads as a person standing in a world rather than a portrait pasted
 * beside a card.
 */
export default function HeroProfile() {
  const { profile, game } = usePortfolio();
  const [hasSkin, setHasSkin] = useState(Boolean(profile.avatarSvg));
  const pointer = usePointer();

  // one random splash per load, like the title screen. Picked in a lazy
  // initialiser so it is chosen once, before first paint, with no second render.
  const [splash] = useState(
    () => game.splashes[Math.floor(Math.random() * game.splashes.length)] ?? '',
  );

  return (
    <section
      id="home"
      data-biome="overworld"
      className="relative z-10 flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* ---------- the character, full height ---------- */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[62%] lg:w-[52%]">
        <div
          aria-hidden
          className="absolute bottom-[30%] left-1/2 h-[42vh] w-[42vh] -translate-x-1/2 rounded-full blur-3xl transition-transform duration-500 ease-out"
          style={{
            background:
              'radial-gradient(circle, rgba(255,216,61,.26) 0%, rgba(176,108,247,.16) 45%, transparent 70%)',
            transform: `translate(${pointer.x * 8}px, ${pointer.y * 5}px)`,
          }}
        />

        {hasSkin && (
          /* pointer parallax lives on the wrapper so it cannot fight the
             bob animation's own transform on the image */
          /* feet land on the horizon (--hz is 64%), so the character stands
             in the world rather than hovering over it */
          <div
            className="absolute bottom-[34%] left-1/2 transition-transform duration-300 ease-out"
            style={{
              transform: `translate(calc(-50% + ${pointer.x * 22}px), ${pointer.y * 12}px)`,
            }}
          >
            <img
              src={profile.avatarSvg}
              alt={`${profile.name}, rendered as a Minecraft character`}
              onError={() => setHasSkin(false)}
              className="mc-float h-[clamp(260px,54vh,620px)] w-auto max-w-none select-none"
              style={{
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 24px 0 rgba(0,0,0,.3))',
              }}
            />
          </div>
        )}
      </div>

      {/* ---------- identity + stats, over the top ---------- */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-24">
        <div className="max-w-[min(560px,64%)]">
          <p
            className="mc-out mb-3 text-[color:var(--gold)]"
            style={{ fontFamily: 'var(--px)', fontSize: 10 }}
          >
            SINGLEPLAYER
          </p>

          <h1
            className="mc-out-lg text-white"
            style={{
              fontFamily: 'var(--px)',
              fontSize: 'clamp(20px,3.6vw,42px)',
              lineHeight: 1.35,
            }}
          >
            JasMehr <span style={{ color: 'var(--gold)' }}>Singh</span>
          </h1>

          {splash && (
            <p
              className="mc-float mt-3 inline-block -rotate-3 text-[color:var(--gold)]"
              style={{ fontFamily: 'var(--px)', fontSize: 9, textShadow: '2px 2px 0 #3e3000' }}
            >
              {splash}
            </p>
          )}

          <p className="mc-out no-break mt-5 text-[22px] leading-snug text-white">
            {profile.tagline}
          </p>

          <div className="mt-7 max-w-md">
            <Panel>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[19px] leading-tight">
                <dt className="text-[color:var(--ink-soft)]">Class</dt>
                <dd className="text-[color:var(--ink)]">{game.className}</dd>
                <dt className="text-[color:var(--ink-soft)]">{game.levelLabel}</dt>
                <dd className="text-[color:var(--ink)]">{profile.yearsOfExperience}</dd>
                <dt className="text-[color:var(--ink-soft)]">Spawn</dt>
                <dd className="text-[color:var(--ink)]">{game.spawn}</dd>
                <dt className="text-[color:var(--ink-soft)]">Status</dt>
                <dd className="text-[color:var(--ink)]">{game.status}</dd>
              </dl>

              <div className="mt-5 grid gap-3">
                <Hearts count={game.hearts} />
                <XpBar level={game.level} percent={72} />
              </div>
            </Panel>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#projects" className="mc-btn px-5 py-3 text-[10px]">
              Open Chest
            </a>
            <a href="#skills" className="mc-btn px-5 py-3 text-[10px]">
              Enchant
            </a>
            <a href="/arcade/" className="mc-btn px-5 py-3 text-[10px]">
              Play Arcade
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
