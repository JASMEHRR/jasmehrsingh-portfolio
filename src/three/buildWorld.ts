import type { BlockId, Placement } from './blocks';

/**
 * Builds the town the camera travels through.
 *
 * It is one continuous settlement laid along X rather than a set of separate
 * dioramas, so you can see the next district approaching before you reach it
 * and the ground between them is real. A road runs the whole length at z=0,
 * which is what makes it read as a town rather than as buildings scattered on
 * a field: everything addresses the same street.
 *
 * Only surfaces are emitted. Interior blocks are never visible and would
 * multiply the instance count for nothing.
 */

export const ZONE_X = {
  home: 0,        // town square
  skills: 46,     // library
  experience: 92, // workshop row
  projects: 138,  // market
  mine: 176,      // mine head
  about: 218,     // gardens
  contact: 258,   // docks
} as const;

export type ZoneKey = keyof typeof ZONE_X;

const HALF_Z = 9;
const ROAD_HALF = 2; // the street is five blocks wide

/** Where the character stands: on the terrain, and clear of the buildings. */
export const HERO_SPOT = { x: 12, z: 7 } as const;

/** Deterministic value noise, so the town is identical on every load. */
function noise(x: number, z: number, seed = 1) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function baseHeight(x: number): number {
  // A town needs buildable ground, so the land is far flatter than a natural
  // landscape would be. It dips once, into the quarry the mine sits in.
  const rolling = Math.sin(x * 0.055) * 1.1 + Math.sin(x * 0.021) * 0.8;
  const start = ZONE_X.mine - 26;
  const end = ZONE_X.mine + 26;
  let quarry = 0;
  if (x > start && x < end) {
    const t = (x - start) / (end - start);
    quarry = -7 * Math.sin(Math.PI * t) ** 2;
  }
  return rolling + quarry;
}

function surfaceHeight(x: number): number {
  return Math.round(baseHeight(x));
}

/**
 * Height for one column. Flat across the street so paving lies true, gently
 * varied further out so the outskirts do not look poured from concrete.
 */
function surfaceAt(x: number, z: number): number {
  if (Math.abs(z) <= ROAD_HALF + 1) return surfaceHeight(x);
  const falloff = Math.min(1, (Math.abs(z) - ROAD_HALF - 1) / 4);
  const across = (Math.sin(z * 0.5 + x * 0.11) * 0.7 + Math.sin(z * 0.2 - x * 0.06) * 0.6) * falloff;
  return Math.round(baseHeight(x) + across);
}

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

function groundBlock(zone: ZoneKey, x: number, z: number): BlockId {
  if (Math.abs(z) <= ROAD_HALF) return 'path';
  if (Math.abs(z) <= ROAD_HALF + 1) return 'gravel';
  if (zone === 'mine') return noise(x, z, 4) > 0.8 ? 'cobble' : 'stone';
  return 'grass';
}

// ---------------------------------------------------------------- pieces

/**
 * A house: walls, a gabled roof, a door and lit windows.
 *
 * The gable is stepped rather than sloped because every block is a cube; each
 * course inset by one and raised by one reads as a pitched roof at a distance,
 * which is exactly how the game does it.
 */
function house(
  out: Placement[], cx: number, cz: number, groundY: number,
  w: number, d: number, wall: BlockId, facingNorth: boolean,
) {
  const hw = Math.floor(w / 2);
  const hd = Math.floor(d / 2);
  const wallTop = 4;

  for (let dx = -hw; dx <= hw; dx++) {
    for (let dz = -hd; dz <= hd; dz++) {
      const edge = Math.abs(dx) === hw || Math.abs(dz) === hd;
      if (!edge) continue;
      for (let dy = 1; dy <= wallTop; dy++) {
        const x = cx + dx;
        const z = cz + dz;

        // corner posts in timber, the rest in the wall material
        const corner = Math.abs(dx) === hw && Math.abs(dz) === hd;
        let id: BlockId = corner ? 'log' : wall;

        // windows at eye level, skipping the corners
        const streetSide = facingNorth ? dz === -hd : dz === hd;
        if (!corner && dy === 3 && (dx + 100) % 2 === 0) id = 'glass';

        // a door on the street side, dead centre
        if (streetSide && dx === 0 && dy <= 2) id = 'planks';

        out.push({ id, x, y: groundY + dy, z });
      }
    }
  }

  // stepped gable, each course narrower and higher than the last
  for (let step = 0; step <= hd; step++) {
    const y = groundY + wallTop + 1 + step;
    for (let dx = -hw - 1; dx <= hw + 1; dx++) {
      for (const dz of [-hd + step, hd - step]) {
        out.push({ id: 'roof', x: cx + dx, y, z: cz + dz });
      }
      if (step === hd) {
        for (let dz = -hd + step; dz <= hd - step; dz++) {
          out.push({ id: 'roof', x: cx + dx, y, z: cz + dz });
        }
      }
    }
  }

  // a lantern beside the door, which is what makes a house look lived in
  const lz = facingNorth ? cz - hd - 1 : cz + hd + 1;
  out.push({ id: 'lantern', x: cx + 2, y: groundY + 3, z: lz });
}

/** A street lamp: a post with a lantern on top. */
function lamp(out: Placement[], x: number, z: number, groundY: number) {
  for (let dy = 1; dy <= 3; dy++) out.push({ id: 'log', x, y: groundY + dy, z });
  out.push({ id: 'lantern', x, y: groundY + 4, z });
}

/** A market stall: an awning on posts with crates underneath. */
function stall(out: Placement[], cx: number, cz: number, groundY: number) {
  for (const dx of [-2, 2]) {
    for (const dz of [-1, 1]) {
      for (let dy = 1; dy <= 3; dy++) {
        out.push({ id: 'log', x: cx + dx, y: groundY + dy, z: cz + dz });
      }
    }
  }
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      out.push({ id: 'roof', x: cx + dx, y: groundY + 4, z: cz + dz });
    }
  }
  out.push({ id: 'planks', x: cx, y: groundY + 1, z: cz });
  out.push({ id: 'planks', x: cx - 1, y: groundY + 1, z: cz });
  out.push({ id: 'ore_gold', x: cx + 1, y: groundY + 1, z: cz });
}

/** The well at the centre of the square. */
function well(out: Placement[], cx: number, cz: number, groundY: number) {
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const rim = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      if (rim) out.push({ id: 'cobble', x: cx + dx, y: groundY + 1, z: cz + dz });
      else out.push({ id: 'water', x: cx + dx, y: groundY + 1, z: cz + dz });
    }
  }
  for (const [dx, dz] of [[-2, -2], [-2, 2], [2, -2], [2, 2]] as const) {
    for (let dy = 2; dy <= 4; dy++) {
      out.push({ id: 'log', x: cx + dx, y: groundY + dy, z: cz + dz });
    }
  }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      out.push({ id: 'roof', x: cx + dx, y: groundY + 5, z: cz + dz });
    }
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

/** The mine head: a timbered portal cut into the quarry wall, plus ore. */
function mineHead(out: Placement[], cx: number, groundY: number) {
  for (let dy = 1; dy <= 5; dy++) {
    out.push({ id: 'log', x: cx - 3, y: groundY + dy, z: -6 });
    out.push({ id: 'log', x: cx + 3, y: groundY + dy, z: -6 });
  }
  for (let dx = -3; dx <= 3; dx++) {
    out.push({ id: 'log', x: cx + dx, y: groundY + 6, z: -6 });
  }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = 1; dy <= 5; dy++) {
      out.push({ id: 'deepslate', x: cx + dx, y: groundY + dy, z: -7 });
    }
  }
  out.push({ id: 'lantern', x: cx - 3, y: groundY + 5, z: -5 });
  out.push({ id: 'lantern', x: cx + 3, y: groundY + 5, z: -5 });

  const ores: BlockId[] = ['ore_diamond', 'ore_emerald', 'ore_gold',
    'ore_copper', 'ore_iron', 'ore_coal', 'ore_amethyst'];
  for (let i = 0; i < 30; i++) {
    const x = cx + Math.round((noise(i, 1, 2) - 0.5) * 30);
    const z = Math.round((noise(i, 2, 3) - 0.5) * 12);
    const y = groundY + 1 + Math.floor(noise(i, 3, 5) * 4);
    out.push({ id: ores[i % ores.length], x, y, z });
  }
}

/** The docks: a jetty over water, lit for the evening. */
function docks(out: Placement[], cx: number, groundY: number) {
  for (let dx = -10; dx <= 12; dx++) {
    for (let dz = 4; dz <= HALF_Z; dz++) {
      out.push({ id: 'water', x: cx + dx, y: groundY, z: dz });
    }
  }
  for (let dz = 3; dz <= 8; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      out.push({ id: 'planks', x: cx + dx, y: groundY + 1, z: dz });
    }
  }
  for (const dz of [4, 7]) {
    out.push({ id: 'log', x: cx - 2, y: groundY + 1, z: dz });
    out.push({ id: 'lantern', x: cx - 2, y: groundY + 2, z: dz });
  }
}

export function buildWorld(): { blocks: Placement[]; heightAt: (x: number) => number } {
  const out: Placement[] = [];
  const minX = -20;
  const maxX = ZONE_X.contact + 24;

  for (let x = minX; x <= maxX; x++) {
    const zone = zoneAt(x);
    for (let z = -HALF_Z; z <= HALF_Z; z++) {
      const y = surfaceAt(x, z);
      out.push({ id: groundBlock(zone, x, z), x, y, z });

      // fill down past the lowest neighbour so no step, however deep, ever
      // shows daylight through the side of the world
      const lowest = Math.min(
        surfaceAt(x - 1, z), surfaceAt(x + 1, z),
        surfaceAt(x, z - 1), surfaceAt(x, z + 1),
      );
      const floor = Math.min(y, lowest) - (Math.abs(z) === HALF_Z ? 4 : 1);
      for (let y2 = y - 1; y2 >= floor; y2--) {
        out.push({ id: y2 <= y - 3 ? 'stone' : 'dirt', x, y: y2, z });
      }
    }
  }

  const clearOfHero = (x: number, z: number) =>
    Math.hypot(x - HERO_SPOT.x, z - HERO_SPOT.z) > 7;
  const h = surfaceHeight;

  // ---- the square: a well, lamps, and houses facing the street ----
  well(out, ZONE_X.home - 8, 0, h(ZONE_X.home - 8));
  house(out, ZONE_X.home - 2, -7, h(ZONE_X.home - 2), 7, 5, 'plaster', false);
  if (clearOfHero(ZONE_X.home + 10, 7)) {
    house(out, ZONE_X.home + 10, 7, h(ZONE_X.home + 10), 7, 5, 'plaster', true);
  }
  house(out, ZONE_X.home + 20, -7, h(ZONE_X.home + 20), 9, 5, 'planks', false);

  // ---- the library: one tall building, walls of books ----
  house(out, ZONE_X.skills, -8, h(ZONE_X.skills), 13, 7, 'bookshelf', false);
  house(out, ZONE_X.skills - 4, 8, h(ZONE_X.skills - 4), 7, 5, 'plaster', true);
  for (let dy = 5; dy <= 9; dy++) {
    for (const [dx, dz] of [[-6, -11], [6, -11], [-6, -5], [6, -5]] as const) {
      out.push({ id: 'stone', x: ZONE_X.skills + dx, y: h(ZONE_X.skills) + dy, z: dz });
    }
  }

  // ---- the workshop row ----
  house(out, ZONE_X.experience - 6, -7, h(ZONE_X.experience - 6), 9, 5, 'planks', false);
  house(out, ZONE_X.experience + 6, 7, h(ZONE_X.experience + 6), 9, 5, 'planks', true);
  for (let dy = 5; dy <= 8; dy++) {
    out.push({ id: 'cobble', x: ZONE_X.experience - 9, y: h(ZONE_X.experience) + dy, z: -8 });
  }

  // ---- the market ----
  for (let i = 0; i < 3; i++) {
    stall(out, ZONE_X.projects - 8 + i * 8, i % 2 ? 6 : -6, h(ZONE_X.projects - 8 + i * 8));
  }
  house(out, ZONE_X.projects + 14, -7, h(ZONE_X.projects + 14), 7, 5, 'plaster', false);

  // ---- the mine ----
  mineHead(out, ZONE_X.mine, h(ZONE_X.mine));

  // ---- the gardens ----
  for (let i = 0; i < 7; i++) {
    const x = ZONE_X.about - 14 + i * 5;
    tree(out, x, h(x), i % 2 ? 7 : -7, true);
  }
  for (let dx = -6; dx <= 6; dx++) {
    for (let dz = 4; dz <= 6; dz++) {
      if (Math.abs(dx) + dz < 11) out.push({ id: 'water', x: ZONE_X.about + dx, y: h(ZONE_X.about), z: dz });
    }
  }

  // ---- the docks ----
  docks(out, ZONE_X.contact, h(ZONE_X.contact));
  house(out, ZONE_X.contact - 6, -7, h(ZONE_X.contact - 6), 7, 5, 'planks', false);

  // ---- street furniture the whole way along ----
  for (let x = minX + 6; x <= maxX - 6; x += 11) {
    const z = (x / 11) % 2 < 1 ? ROAD_HALF + 1 : -(ROAD_HALF + 1);
    if (clearOfHero(x, z)) lamp(out, x, z, surfaceAt(x, z));
  }

  // scattered trees on the outskirts, away from the buildings and the street
  for (let x = minX; x <= maxX; x += 7) {
    const zone = zoneAt(x);
    if (zone === 'mine' || zone === 'about' || zone === 'contact') continue;
    const z = noise(x, 0, 12) > 0.5 ? HALF_Z - 1 : -(HALF_Z - 1);
    if (clearOfHero(x, z) && noise(x, z, 13) > 0.45) tree(out, x, surfaceAt(x, z), z, false);
  }

  return { blocks: out, heightAt: surfaceHeight };
}
