import type { BlockId, Placement } from './blocks';

/**
 * Generates the world the camera flies through.
 *
 * It is one continuous strip laid out along X, with a zone per section of the
 * site. Building it as a single landscape rather than six separate dioramas is
 * what makes scrolling feel like travelling somewhere: you can see the next
 * zone approaching before you arrive, and the terrain between them is real.
 *
 * Only surfaces are emitted. Interior blocks would never be visible and would
 * multiply the instance count for nothing.
 */

export const ZONE_X = {
  home: 0,
  skills: 44,
  experience: 88,
  projects: 132,
  mine: 168,
  about: 212,
  contact: 252,
} as const;

export type ZoneKey = keyof typeof ZONE_X;

/**
 * Where the character stands.
 *
 * Kept here rather than in the renderer because the terrain has to know: z must
 * be inside the strip (|z| <= HALF_Z) or he stands on nothing, and the scenery
 * pass has to leave him a clearing instead of growing a tree through him.
 */
export const HERO_SPOT = { x: 12, z: 7 } as const;

const HALF_Z = 8; // world runs 17 blocks deep, enough to fill a wide viewport

/** Deterministic value noise, so the terrain is identical on every load. */
function noise(x: number, z: number, seed = 1) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function baseHeight(x: number): number {
  // gentle rolling ground, dipping into a trench for the cave zones
  const rolling = Math.sin(x * 0.11) * 1.6 + Math.sin(x * 0.037) * 2.2;
  // a smooth basin rather than a step: a hard drop would leave cliff faces
  // taller than the fill below them and you would see daylight through the map
  const start = ZONE_X.projects - 30;
  const end = ZONE_X.mine + 30;
  let caveDip = 0;
  if (x > start && x < end) {
    const t = (x - start) / (end - start);
    caveDip = -9 * Math.sin(Math.PI * t) ** 2;
  }
  return rolling + caveDip;
}

/** Rounded profile along X, used for the camera and for placing scenery. */
function surfaceHeight(x: number): number {
  return Math.round(baseHeight(x));
}

/**
 * Surface height for a specific column.
 *
 * The variation is smooth in both axes rather than a per-block coin flip.
 * Random +1 spikes read as damage from a low camera: you see the shaded side
 * of a single raised cube and the ground looks pocked with holes.
 */
function surfaceAt(x: number, z: number): number {
  const across = Math.sin(z * 0.42 + x * 0.09) * 0.8 + Math.sin(z * 0.17 - x * 0.05) * 0.7;
  return Math.round(baseHeight(x) + across);
}

/** Which zone a given x belongs to, used to pick surface materials. */
function zoneAt(x: number): ZoneKey {
  const entries = Object.entries(ZONE_X) as [ZoneKey, number][];
  let best: ZoneKey = 'home';
  let bestD = Infinity;
  for (const [k, v] of entries) {
    const d = Math.abs(x - v);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

function surfaceBlock(zone: ZoneKey, x: number, z: number): BlockId {
  switch (zone) {
    case 'skills':
      return 'obsidian';
    case 'experience':
      return 'planks';
    case 'projects':
    case 'mine':
      return noise(x, z, 4) > 0.86 ? 'cobble' : 'deepslate';
    default:
      return 'grass';
  }
}

function tree(out: Placement[], x: number, y: number, z: number, cherry: boolean) {
  const log: BlockId = cherry ? 'cherry_log' : 'log';
  const leaf: BlockId = cherry ? 'cherry_leaves' : 'leaves';
  const h = 4 + Math.floor(noise(x, z, 9) * 2);
  for (let i = 1; i <= h; i++) out.push({ id: log, x, y: y + i, z });
  for (let dy = h - 1; dy <= h + 1; dy++) {
    const r = dy === h + 1 ? 1 : 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy <= h) continue;
        if (Math.abs(dx) === r && Math.abs(dz) === r) continue;
        out.push({ id: leaf, x: x + dx, y: y + dy, z: z + dz });
      }
    }
  }
}

/** The enchanting room: a sunken obsidian chamber ringed with bookshelves. */
function stronghold(out: Placement[], cx: number, groundY: number) {
  for (let dx = -6; dx <= 6; dx++) {
    for (let dz = -6; dz <= 6; dz++) {
      const edge = Math.abs(dx) === 6 || Math.abs(dz) === 6;
      if (!edge) continue;
      for (let dy = 1; dy <= 4; dy++) {
        // mostly bookshelves: they carry colour, where obsidian swallows light
        const id: BlockId = dy <= 3 && (Math.abs(dx) + Math.abs(dz)) % 4 !== 0 ? 'bookshelf' : 'obsidian';
        out.push({ id, x: cx + dx, y: groundY + dy, z: dz });
      }
    }
  }
  // the table itself, raised on a small obsidian plinth
  out.push({ id: 'obsidian', x: cx, y: groundY + 1, z: 0 });
  out.push({ id: 'obsidian', x: cx, y: groundY + 2, z: 0 });
}

/** The workshop: a plank platform with a crafting bench and a log frame. */
function workshop(out: Placement[], cx: number, groundY: number) {
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      if (Math.abs(dx) === 5 || Math.abs(dz) === 5) {
        out.push({ id: 'log', x: cx + dx, y: groundY + 1, z: dz });
      }
    }
  }
  for (const [dx, dz] of [[-5, -5], [-5, 5], [5, -5], [5, 5]] as const) {
    for (let dy = 2; dy <= 4; dy++) out.push({ id: 'log', x: cx + dx, y: groundY + dy, z: dz });
  }
  out.push({ id: 'planks', x: cx, y: groundY + 1, z: 0 });
  out.push({ id: 'planks', x: cx, y: groundY + 2, z: 0 });
}

/** Ore seams for the cave zones — the reason to look at the walls. */
function oreSeam(out: Placement[], cx: number, groundY: number) {
  const ores: BlockId[] = [
    'ore_diamond',
    'ore_emerald',
    'ore_gold',
    'ore_copper',
    'ore_iron',
    'ore_coal',
    'ore_amethyst',
  ];
  for (let i = 0; i < 46; i++) {
    const x = cx + Math.round((noise(i, 1, 2) - 0.5) * 34);
    const z = Math.round((noise(i, 2, 3) - 0.5) * 14);
    const y = groundY + 1 + Math.floor(noise(i, 3, 5) * 5);
    out.push({ id: ores[i % ores.length], x, y, z });
  }
}

export function buildWorld(): { blocks: Placement[]; heightAt: (x: number) => number } {
  const out: Placement[] = [];
  const minX = -18;
  const maxX = ZONE_X.contact + 24;

  for (let x = minX; x <= maxX; x++) {
    const zone = zoneAt(x);
    const below: BlockId =
      zone === 'projects' || zone === 'mine'
        ? 'deepslate'
        : zone === 'skills'
          ? 'obsidian'
          : zone === 'experience'
            ? 'planks'
            : 'dirt';

    for (let z = -HALF_Z; z <= HALF_Z; z++) {
      const y = surfaceAt(x, z);
      out.push({ id: surfaceBlock(zone, x, z), x, y, z });

      // fill down past the lowest of the four neighbours so no step, however
      // deep, ever shows daylight through the side of the world
      const lowest = Math.min(
        surfaceAt(x - 1, z),
        surfaceAt(x + 1, z),
        surfaceAt(x, z - 1),
        surfaceAt(x, z + 1),
      );
      const floor = Math.min(y, lowest) - (Math.abs(z) === HALF_Z ? 4 : 1);
      for (let y2 = y - 1; y2 >= floor; y2--) {
        out.push({ id: y2 <= y - 3 ? 'stone' : below, x, y: y2, z });
      }
    }
  }

  // ---- scenery per zone ----
  // Trees keep clear of the character: a canopy is 5 blocks across, so anything
  // rooted within that of him grows straight through his head.
  const clearOfHero = (x: number, z: number) =>
    Math.hypot(x - HERO_SPOT.x, z - HERO_SPOT.z) > 7;

  for (let i = 0; i < 7; i++) {
    const x = -14 + i * 5;
    const z = i % 2 ? 6 : -6;
    if (Math.abs(x - ZONE_X.home) > 4 && clearOfHero(x, z)) {
      tree(out, x, surfaceHeight(x), z, false);
    }
  }
  stronghold(out, ZONE_X.skills, surfaceHeight(ZONE_X.skills));
  workshop(out, ZONE_X.experience, surfaceHeight(ZONE_X.experience));
  oreSeam(out, ZONE_X.projects, surfaceHeight(ZONE_X.projects));
  oreSeam(out, ZONE_X.mine, surfaceHeight(ZONE_X.mine));
  for (let i = 0; i < 6; i++) {
    const x = ZONE_X.about - 12 + i * 5;
    tree(out, x, surfaceHeight(x), i % 2 ? 6 : -6, true);
  }
  for (let i = 0; i < 4; i++) {
    const x = ZONE_X.contact - 8 + i * 6;
    tree(out, x, surfaceHeight(x), i % 2 ? 7 : -7, false);
  }

  return { blocks: out, heightAt: surfaceHeight };
}
