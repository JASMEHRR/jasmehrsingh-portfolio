import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Loads the voxel character and rigs it for an idle animation.
 *
 * The model is built in Blender (project "JasMehr Minecraft Character") and
 * exported to /character.glb: cube body at Minecraft proportions, a face laid
 * out as a 16x16 pixel map, and an afro of roughly 1,400 small cubes whose
 * tones were measured off the reference render.
 *
 * There was an attempt to replace this with a character assembled in code from
 * crops of the reference image, on the theory that real pixels would match it
 * exactly. It did not: a perspective render does not project onto flat cube
 * faces, so the crops arrived stretched and misaligned and the result looked
 * far worse than the model it replaced. The model stays.
 *
 * Rigging is done here rather than in Blender because glTF carries each
 * object's origin as its node translation, and the limbs were exported with
 * their origins already at the shoulder and hip. Rotating those nodes is
 * therefore correct without further work; only the head, which is many separate
 * meshes, needs a pivot built for it.
 */

export interface Character {
  group: THREE.Group;
  /** Advance the idle. `still` parks him facing forward. */
  update(time: number, still: boolean): void;
}

const HEAD_PARTS = [
  'Head', 'FaceHair', 'Spectacles', 'SpectaclesLit', 'EyeWhites',
  'Pupils', 'Beard', 'Mouth', 'Nose', 'AfroDeep', 'AfroMid', 'AfroLit',
];
const TORSO_PARTS = ['Torso', 'LogoBand', 'LogoEyes', 'LogoHat', 'LogoSkull'];
const HEAD_Y = 1.75;

/**
 * Collects named meshes under a new pivot at `pivotY`.
 *
 * Their own origins sit at the model root, so each child is shifted down by
 * the pivot height as it is reparented; otherwise attaching to a raised pivot
 * would lift the whole head off the shoulders.
 */
function pivotFrom(root: THREE.Object3D, names: string[], pivotY: number) {
  const pivot = new THREE.Group();
  pivot.position.y = pivotY;
  root.add(pivot);
  for (const name of names) {
    const part = root.getObjectByName(name);
    if (!part) continue;
    part.position.y -= pivotY;
    pivot.add(part);
  }
  return pivot;
}

/** Groups an already-correctly-placed limb pair so both halves swing as one. */
function limbPivot(root: THREE.Object3D, names: string[]) {
  const first = root.getObjectByName(names[0]);
  if (!first) return null;
  const pivot = new THREE.Group();
  pivot.position.copy(first.position);
  root.add(pivot);
  for (const name of names) {
    const part = root.getObjectByName(name);
    if (!part) continue;
    part.position.sub(pivot.position);
    pivot.add(part);
  }
  return pivot;
}

export function loadCharacter(): Promise<Character> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      '/character.glb',
      (gltf) => {
        const group = gltf.scene;

        const head = pivotFrom(group, HEAD_PARTS, HEAD_Y);
        const torso = pivotFrom(group, TORSO_PARTS, 0);
        const armL = limbPivot(group, ['ArmL_skin', 'ArmL_sleeve']);
        const armR = limbPivot(group, ['ArmR_skin', 'ArmR_sleeve']);
        const legL = limbPivot(group, ['LegL_trousers', 'LegL_pocket', 'LegL_shoe']);
        const legR = limbPivot(group, ['LegR_trousers', 'LegR_pocket', 'LegR_shoe']);

        resolve({
          group,
          update(t, still) {
            if (still) {
              group.rotation.y = 0;
              group.position.y = 0;
              head.rotation.set(0, 0, 0);
              torso.rotation.set(0, 0, 0);
              [armL, armR].forEach((a, i) => a?.rotation.set(0, 0, i ? -0.05 : 0.05));
              [legL, legR].forEach((l) => l?.rotation.set(0, 0, 0));
              return;
            }

            // A turn, not a spin: the model is only detailed on the front, so a
            // full revolution would park a plain back toward the reader for
            // half of every cycle.
            const turn = Math.sin(t * 0.4);
            group.rotation.y = turn * 0.95;

            // breathing, and the weight shift that comes with it
            torso.rotation.z = turn * 0.02;
            torso.position.y = Math.sin(t * 1.6) * 0.018;

            // arms swing out of phase, with a little shoulder roll
            const swing = Math.sin(t * 1.3);
            if (armL) {
              armL.rotation.x = swing * 0.2;
              armL.rotation.z = 0.05 + Math.sin(t * 1.6) * 0.03;
            }
            if (armR) {
              armR.rotation.x = -swing * 0.2;
              armR.rotation.z = -0.05 - Math.sin(t * 1.6) * 0.03;
            }

            // barely any leg movement: he is standing, not walking
            if (legL) legL.rotation.x = swing * 0.04;
            if (legR) legR.rotation.x = -swing * 0.04;

            // the head leads the turn and nods, which is what stops the whole
            // figure reading as one rigid object on a turntable
            head.rotation.y = Math.sin(t * 0.4 + 0.55) * 0.18;
            head.rotation.x = Math.sin(t * 1.1) * 0.05;
          },
        });
      },
      undefined,
      reject,
    );
  });
}
