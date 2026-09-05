import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePortfolio } from '../hooks/usePortfolio';
import { useEntranceOnMount } from '../hooks/useEntrance';
import SocialLinks from './SocialLinks';

/**
 * Doc §02 §1 + §04 prompt 02.
 * Full-viewport hero laid out as a CSS Grid: nav / headline / avatar / tagline.
 * The avatar spans rows 2-3 with a higher z-index so the character bursts
 * through the title — cleaner than absolute positioning and stable across
 * breakpoints.
 *
 * Doc §01 lesson 2: layered parallax with a different rate per layer is what
 * makes the hero feel alive. Glow slow, figure mid, sheen fast.
 */
export default function HeroSection() {
  const { profile } = usePortfolio();
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [hasAvatar, setHasAvatar] = useState(Boolean(profile.avatarSvg));
  const reduced = useReducedMotion();
  const headlineEntrance = useEntranceOnMount();
  const taglineEntrance = useEntranceOnMount(0.25);
  const headline = `Hi, I'm ${profile.shortName}`;

  useEffect(() => {
    if (reduced) return;

    const onMove = (e: MouseEvent) => {
      setPointer({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduced]);

  // Depth per layer — the glow drifts slowest, the figure sits mid, the sheen
  // rides fastest. Different rates per layer is what stops the whole block
  // moving as one flat plane like a security camera.
  const glow = { x: pointer.x * 6, y: pointer.y * 4 };
  const head = { x: pointer.x * 14, y: pointer.y * 9 };
  const sheen = { x: pointer.x * 30, y: pointer.y * 18 };

  return (
    <section
      id="home"
      className="relative grid min-h-screen grid-rows-[auto_auto_1fr_auto] overflow-hidden px-6 pb-16 pt-28"
    >
      {/* row 1 — spacer under the fixed navbar */}
      <div aria-hidden />

      {/* row 2 — headline */}
      <motion.h1
        {...headlineEntrance}
        style={{ '--hero-ch': headline.length } as CSSProperties}
        className="hero-heading hero-heading-size relative z-10 row-start-2 text-center font-semibold"
      >
        {headline}
      </motion.h1>

      {/* rows 2-3 — avatar bursts through the headline */}
      <div className="pointer-events-none relative z-20 row-start-3 -mt-[6vw] grid place-items-center">
        {/* slowest layer — a soft accent glow sitting behind the figure */}
        <motion.span
          aria-hidden
          style={{ x: glow.x, y: glow.y }}
          transition={{ type: 'spring', stiffness: 40, damping: 20 }}
          className="pointer-events-none absolute h-[34vh] max-h-[380px] w-[34vh] max-w-[380px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.22)_0%,rgba(225,48,108,0.10)_45%,transparent_70%)] blur-2xl"
        />

        {hasAvatar ? (
          <motion.div
            style={{ x: head.x, y: head.y }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
            className="relative"
          >
            <img
              src={profile.avatarSvg}
              alt={profile.name}
              onError={() => setHasAvatar(false)}
              className="h-[38vh] max-h-[420px] w-auto select-none object-contain drop-shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            />
            {/* fastest layer — a specular sheen that slides across the figure */}
            <motion.span
              aria-hidden
              style={{
                x: sheen.x,
                y: sheen.y,
                WebkitMaskImage: `url(${profile.avatarSvg})`,
                maskImage: `url(${profile.avatarSvg})`,
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
              transition={{ type: 'spring', stiffness: 90, damping: 14 }}
              className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.16)_50%,transparent_65%)]"
            />
          </motion.div>
        ) : (
          <motion.div
            style={{ x: head.x, y: head.y }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
            className="grid h-[30vh] max-h-[300px] w-[30vh] max-w-[300px] place-items-center rounded-full border border-line bg-card"
          >
            <span className="hero-heading text-[18vh] font-semibold leading-none">
              {profile.shortName.charAt(0)}
            </span>
          </motion.div>
        )}
      </div>

      {/* row 4 — tagline + social pills */}
      <motion.div
        {...taglineEntrance}
        className="row-start-4 mx-auto max-w-2xl text-center"
      >
        <p className="no-break mb-2 text-lg text-neutral-200 sm:text-xl">{profile.tagline}</p>
        <p className="no-break mb-8 text-sm text-neutral-400">
          {profile.role} · {profile.location}
        </p>
        <SocialLinks social={profile.social} />
      </motion.div>
    </section>
  );
}
