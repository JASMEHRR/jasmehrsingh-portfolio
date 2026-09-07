import * as THREE from 'three';

/**
 * Block palette for the voxel world.
 *
 * Every material reuses the same 16x16 pixel-art PNGs the 2D site uses, loaded
 * with NearestFilter so a 16px texture stretched over a whole cube face stays
 * blocky instead of turning into a smear. That is the single most important
 * setting for making WebGL look like Minecraft rather than like a low-res
 * render of something else.
 */

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

export function tex(name: string): THREE.Texture {
  const hit = cache.get(name);
  if (hit) return hit;
  const t = loader.load(`/tex/${name}.png`);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  cache.set(name, t);
  return t;
}

function mat(name: string) {
  return new THREE.MeshLambertMaterial({ map: tex(name) });
}

export type BlockId =
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'deepslate'
  | 'cobble'
  | 'planks'
  | 'obsidian'
  | 'bookshelf'
  | 'ore_diamond'
  | 'ore_emerald'
  | 'ore_gold'
  | 'ore_copper'
  | 'ore_iron'
  | 'ore_coal'
  | 'ore_amethyst'
  | 'cherry_leaves'
  | 'cherry_log'
  | 'leaves'
  | 'log'
  | 'plaster'
  | 'roof'
  | 'glass'
  | 'lantern'
  | 'gravel'
  | 'path'
  | 'water';

/**
 * Materials per block. A cube's six groups are ordered +x, -x, +y, -y, +z, -z,
 * so grass gets a green top, dirt underside and grass-side elsewhere — the
 * detail that stops a grass block reading as a flat green cube.
 */
export function materialsFor(id: BlockId): THREE.Material | THREE.Material[] {
  switch (id) {
    case 'grass': {
      const side = mat('grass_side');
      return [side, side, mat('grass_top'), mat('dirt'), side, side];
    }
    case 'lantern':
      // emissive so it reads as a light source rather than a yellow cube; the
      // scene has no per-block lighting, so the glow has to come from here
      return new THREE.MeshLambertMaterial({
        map: tex('lantern'),
        emissive: new THREE.Color(0xffb84d),
        emissiveIntensity: 0.9,
      });
    case 'glass':
      return new THREE.MeshLambertMaterial({
        map: tex('glass'),
        emissive: new THREE.Color(0xffd9a0),
        emissiveIntensity: 0.35,
      });
    case 'water':
      return new THREE.MeshLambertMaterial({
        map: tex('water'),
        transparent: true,
        opacity: 0.86,
      });
    case 'cherry_leaves':
      return new THREE.MeshLambertMaterial({ color: 0xf0a0c0 });
    case 'cherry_log':
      return new THREE.MeshLambertMaterial({ color: 0x6b4a3a });
    case 'leaves':
      return new THREE.MeshLambertMaterial({ color: 0x3f9a35 });
    case 'log':
      return new THREE.MeshLambertMaterial({ color: 0x4a2d12 });
    default:
      return mat(id);
  }
}

export interface Placement {
  id: BlockId;
  x: number;
  y: number;
  z: number;
}

/** Group placements by block id so each type becomes one InstancedMesh. */
export function groupById(blocks: Placement[]) {
  const byId = new Map<BlockId, Placement[]>();
  for (const b of blocks) {
    const list = byId.get(b.id);
    if (list) list.push(b);
    else byId.set(b.id, [b]);
  }
  return byId;
}
