/**
 * Which site this page load is.
 *
 * There are two front ends on one domain. The glass portfolio at / is the
 * one a recruiter should land on; the Minecraft world at /minecraft is the
 * playful one, reached from the grass-block button. Editing is not a page of
 * its own: it happens on the glass site itself, behind the password (see
 * src/glass/EditMode.tsx).
 *
 * Decided once, before React renders, because the two sites style <body>
 * differently: main.tsx stamps the answer on <html data-mode> so the right
 * stylesheet applies from the first paint instead of flashing the other one.
 */
export type Mode = 'glass' | 'minecraft';

export function currentMode(): Mode {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/minecraft') return 'minecraft';
  return 'glass';
}
