import { useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePointer } from '../hooks/usePointer';
import { Panel, Hearts, XpBar, Block } from './mc/Gui';

/**
 * The player screen: stats on the left, character on the right.
 *
 * The avatar is the real skin render at public/avatar.png. If it is missing
 * the <img> removes itself and the armour-stand plinth stays, so the layout
 * never collapses into a broken icon.
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
      className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-center gap-8 px-4 py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12"
    >
      {/* ---------- left: identity + stats ---------- */}
      <div>
        <p
          className="mc-out mb-3 text-[color:var(--gold)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          SINGLEPLAYER
        </p>

        <h1
          className="mc-out-lg text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 'clamp(22px,4.4vw,44px)', lineHeight: 1.35 }}
        >
          JasMehr <span style={{ color: 'var(--gold)' }}>Singh</span>
        </h1>

        {splash && (
          <p
            className="mc-float mt-3 inline-block -rotate-3 text-[color:var(--gold)]"
            style={{ fontFamily: 'var(--px)', fontSize: 10, textShadow: '2px 2px 0 #3e3000' }}
          >
            {splash}
          </p>
        )}

        <p className="mc-out no-break mt-5 max-w-xl text-[22px] leading-snug text-white">
          {profile.tagline}
        </p>

        <div className="mt-7 max-w-md">
          <Panel>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[19px] leading-tight">
              <dt className="text-[color:var(--ink-soft)]">Class</dt>
              <dd className="text-[color:var(--ink)]">{game.className}</dd>
              <dt className="text-[color:var(--ink-soft)]">Level</dt>
              <dd className="text-[color:var(--ink)]">
                {game.level} — {profile.yearsOfExperience} years played
              </dd>
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
            Open Projects Chest
          </a>
          <a href="#skills" className="mc-btn px-5 py-3 text-[10px]">
            Enchant with Skills
          </a>
          <a href="/arcade/" className="mc-btn px-5 py-3 text-[10px]">
            Play Arcade
          </a>
        </div>
      </div>

      {/* ---------- right: the character on a plinth ---------- */}
      <div className="relative grid place-items-center">
        <div
          aria-hidden
          className="absolute h-[260px] w-[260px] rounded-full blur-2xl transition-transform duration-500 ease-out sm:h-[320px] sm:w-[320px]"
          style={{
            background:
              'radial-gradient(circle, rgba(255,216,61,.22) 0%, rgba(176,108,247,.14) 45%, transparent 70%)',
            transform: `translate(${pointer.x * 8}px, ${pointer.y * 5}px)`,
          }}
        />

        {hasSkin ? (
          /* pointer parallax lives on the wrapper so it cannot fight the
             bob animation's own transform on the image */
          <div
            className="relative transition-transform duration-300 ease-out"
            style={{ transform: `translate(${pointer.x * 20}px, ${pointer.y * 12}px)` }}
          >
            <img
              src={profile.avatarSvg}
              alt={`${profile.name}, rendered as a Minecraft character`}
              onError={() => setHasSkin(false)}
              className="mc-float h-[clamp(240px,42vh,420px)] w-auto select-none"
              style={{
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 18px 0 rgba(0,0,0,.32))',
              }}
            />
          </div>
        ) : (
          <div className="relative grid h-[260px] w-[160px] place-items-end" aria-hidden>
            <Block color="#6b4a3a" size={120} />
          </div>
        )}

        {/* the block the character stands on */}
        <div
          aria-hidden
          className="relative mt-2 h-4 w-[210px]"
          style={{
            background: 'repeating-linear-gradient(90deg,#4caf3f 0 14px,#43a037 14px 28px)',
            boxShadow: 'inset 0 3px 0 rgba(255,255,255,.2), 0 6px 0 rgba(0,0,0,.35)',
          }}
        />
      </div>
    </section>
  );
}
