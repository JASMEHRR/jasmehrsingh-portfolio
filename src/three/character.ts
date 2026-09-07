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

const HEAD_PARTS = ['HeadTextured', 'AfroDeep', 'AfroMid', 'AfroLit'];

/** Modelled face features, replaced by the photographed one. */
const MODELLED_FACE = [
  'Head', 'FaceHair', 'Spectacles', 'SpectaclesLit',
  'EyeWhites', 'Pupils', 'Beard', 'Mouth', 'Nose',
];
const SKIN = 0xf4995d;
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

/**
 * Swap the glTF's PBR materials for the same Lambert shading the terrain uses.
 *
 * Blender exports Principled BSDF as metallic-roughness, which three.js loads
 * as MeshStandardMaterial. Lit by the same lamps as the Lambert world blocks,
 * that reads several stops brighter: the skin washed from orange to pale cream
 * and the black afro came out brown. Matching the material model matters more
 * here than keeping PBR, because a voxel character has no reflections to lose.
 */
function flatten(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const from = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const to = from.map((m) => {
      const src = m as THREE.MeshStandardMaterial;
      const flat = new THREE.MeshLambertMaterial({
        color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
        map: src.map ?? null,
        transparent: src.transparent,
        opacity: src.opacity,
      });
      src.dispose();
      return flat;
    });
    mesh.material = Array.isArray(mesh.material) ? to : to[0];
  });
}

/**
 * Replace the modelled face with the reference render's own pixels.
 *
 * The face was a 16x16 pixel map extruded a voxel deep, and repeated rounds of
 * tuning never matched: the reference carries far more detail than 16x16 can
 * hold, and its glasses are a solid object with thickness rather than a few
 * flat cells. Cutting the face out of the render and mapping it onto the
 * cube's front settles it, because it stops being an approximation.
 *
 * Only the face is treated this way. Texturing the whole figure from crops was
 * tried and failed - a perspective render does not project onto flat cube
 * faces, so limbs arrived stretched. The face survives it by being nearly
 * frontal and nearly planar; everything else stays modelled.
 *
 * Blender's -Y is glTF's +Z, so the photographed side is material index 4.
 */
function applyFace(root: THREE.Object3D) {
  for (const name of MODELLED_FACE) {
    root.getObjectByName(name)?.removeFromParent();
  }

  const tex = new THREE.TextureLoader().load('/face.png');
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  const skin = new THREE.MeshLambertMaterial({ color: SKIN });
  const face = new THREE.MeshLambertMaterial({ map: tex });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5),
    [skin, skin, skin, skin, face, skin]);
  head.name = 'HeadTextured';
  head.position.set(0, 1.75, 0);
  root.add(head);
}

export function loadCharacter(): Promise<Character> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      '/character.glb',
      (gltf) => {
        const group = gltf.scene;
        flatten(group);
        applyFace(group);

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
