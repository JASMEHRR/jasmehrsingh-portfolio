import * as THREE from 'three';

/**
 * Builds the character from the reference render itself.
 *
 * Earlier versions approximated him: cube colours tuned by eye, a face drawn as
 * a 16x16 pixel map, an afro generated from an ellipsoid. Every round got
 * closer and none matched, because a hand-authored approximation of a render is
 * always a guess at it.
 *
 * This takes the opposite approach. tools/extract_character.py cuts the actual
 * pixels out of public/avatar.png into public/char/*.png and samples that
 * image's hair mask into hair.json. The face here is therefore the face in the
 * render — same glasses, same beard, same eyes — and the afro's outline is the
 * outline that was drawn, not one fitted to it.
 *
 * Proportions come from the reference too: its face box is 330px wide and maps
 * onto the 0.5-unit head cube, which fixes the scale at 660px per world unit
 * and places every other part from there.
 */

export interface HairMask {
  grid: number[][];
  tone: number[][];
  cols: number;
  rows: number;
  headRegion: [number, number, number, number];
  faceBox: [number, number, number, number];
}

export interface Character {
  group: THREE.Group;
  /** Advance the idle animation. `still` freezes him facing forward. */
  update(time: number, still: boolean): void;
}

/** px per world unit, derived from the face box mapping onto the head cube */
const PPU = 660;
const HEAD_CENTRE_Y = 1.75;
const SHOULDER_Y = 1.5;
const HIP_Y = 0.75;

function pixelTexture(loader: THREE.TextureLoader, url: string) {
  const t = loader.load(url);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Six materials for a box, in three.js face order (+x, -x, +y, -y, +z, -z).
 * Only the +z face carries the photo; the rest are flat colours sampled from
 * the same region, since the reference only ever showed us his front.
 */
function boxMaterials(front: THREE.Texture, side: number, top = side, bottom = side) {
  const flat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  return [flat(side), flat(side), flat(top), flat(bottom),
    new THREE.MeshLambertMaterial({ map: front }), flat(side)];
}

/**
 * A limb whose geometry is shifted so the mesh's origin sits at its pivot.
 * Rotating a centred box swings it around its middle, which makes an arm
 * scissor through the shoulder instead of hanging from it.
 */
function limb(
  w: number, h: number, d: number,
  front: THREE.Texture, side: number, top: number, bottom: number,
) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, -h / 2, 0);
  return new THREE.Mesh(geo, boxMaterials(front, side, top, bottom));
}

export function buildCharacter(mask: HairMask): Character {
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();

  const faceTex = pixelTexture(loader, '/char/face.png');
  const torsoTex = pixelTexture(loader, '/char/torso.png');
  const armLTex = pixelTexture(loader, '/char/arm_left.png');
  const armRTex = pixelTexture(loader, '/char/arm_right.png');

  // The legs crop covers both legs, so each leg samples its own half of it.
  // Cloning is required: sharing one texture would apply the last offset set.
  const legLTex = pixelTexture(loader, '/char/legs.png');
  legLTex.repeat.set(0.5, 1);
  legLTex.offset.set(0, 0);
  const legRTex = legLTex.clone();
  legRTex.needsUpdate = true;
  legRTex.repeat.set(0.5, 1);
  legRTex.offset.set(0.5, 0);

  const SKIN = 0xf4995d;
  const SHIRT = 0x201e20;
  const PANTS = 0x312f32;
  const SHOE = 0xa99da0;

  // ---- torso and head ride on a body node, so breathing moves both ----
  const body = new THREE.Group();
  group.add(body);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.75, 0.26),
    boxMaterials(torsoTex, SHIRT),
  );
  torso.position.set(0, 1.125, 0);
  body.add(torso);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, HEAD_CENTRE_Y, 0);
  body.add(headPivot);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    boxMaterials(faceTex, SKIN),
  );
  headPivot.add(head);

  // ---- limbs, each hanging from its own pivot ----
  const armL = limb(0.25, 0.75, 0.25, armLTex, SKIN, SHIRT, SKIN);
  armL.position.set(-0.378, SHOULDER_Y, 0);
  body.add(armL);

  const armR = limb(0.25, 0.75, 0.25, armRTex, SKIN, SHIRT, SKIN);
  armR.position.set(0.378, SHOULDER_Y, 0);
  body.add(armR);

  const legL = limb(0.25, 0.75, 0.26, legLTex, PANTS, PANTS, SHOE);
  legL.position.set(-0.125, HIP_Y, 0);
  group.add(legL);

  const legR = limb(0.25, 0.75, 0.26, legRTex, PANTS, PANTS, SHOE);
  legR.position.set(0.125, HIP_Y, 0);
  group.add(legR);

  // ---- the afro, placed from the reference's own hair mask ----
  const [hx0, hy0, hx1, hy1] = mask.headRegion;
  const [fx0, fy0, fx1, fy1] = mask.faceBox;
  const faceCx = (fx0 + fx1) / 2;
  const faceCy = (fy0 + fy1) / 2;

  const cellW = (hx1 - hx0) / mask.cols;
  const cellH = (hy1 - hy0) / mask.rows;
  const cube = Math.max(cellW, cellH) / PPU * 1.15;

  const RX = (hx1 - hx0) / 2 / PPU;
  const RY = (hy1 - hy0) / 2 / PPU;
  const DEPTH = 0.3;

  type Curl = { x: number; y: number; z: number; tone: number };
  const curls: Curl[] = [];

  for (let gy = 0; gy < mask.rows; gy++) {
    for (let gx = 0; gx < mask.cols; gx++) {
      if (!mask.grid[gy][gx]) continue;

      const wx = (hx0 + (gx + 0.5) * cellW - faceCx) / PPU;
      // relative to the head's centre, because the curls are parented to the
      // head pivot and must turn with it
      const wy = -(hy0 + (gy + 0.5) * cellH - faceCy) / PPU;

      const nx = wx / RX;
      const ny = wy / RY;
      const inside = Math.max(0, 1 - nx * nx - ny * ny);
      const d = Math.sqrt(inside) * DEPTH;
      const tone = mask.tone[gy][gx] || 24;

      // Nothing may bulge forward across the face: the head's front plane
      // carries the real photo, so a curl in front of it hides the glasses.
      const overFace = Math.abs(wx) < 0.28 && wy < 0.28;

      if (!overFace) curls.push({ x: wx, y: wy, z: d, tone });
      if (d > 0.06) curls.push({ x: wx, y: wy, z: -d, tone: tone * 0.75 });
      if (inside < 0.25) curls.push({ x: wx, y: wy, z: 0, tone: tone * 0.9 });
    }
  }

  const hairGeo = new THREE.BoxGeometry(cube, cube, cube);
  // Base colour is the reference's hair, not white. Per-instance colour is a
  // multiplier on top, so if instanceColor is ever unsupported the hair is
  // still black rather than a grey wig.
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x171212 });
  const hair = new THREE.InstancedMesh(hairGeo, hairMat, curls.length);
  const dummy = new THREE.Object3D();
  const colour = new THREE.Color();

  curls.forEach((c, i) => {
    const j = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    dummy.position.set(c.x + j * 0.012, c.y + j * 0.012, c.z + j * 0.02);
    dummy.scale.setScalar(0.9 + Math.abs(j) * 0.35);
    dummy.updateMatrix();
    hair.setMatrixAt(i, dummy.matrix);
    // median hair tone in the reference is 22/255, so dividing by it keeps the
    // mid curls at the base colour and lets lit ones brighten
    const v = Math.min(2.2, Math.max(0.45, c.tone / 22));
    colour.setRGB(v, v * 0.95, v * 0.92);
    hair.setColorAt(i, colour);
  });
  hair.instanceMatrix.needsUpdate = true;
  if (hair.instanceColor) hair.instanceColor.needsUpdate = true;
  hair.frustumCulled = false;
  headPivot.add(hair);

  return {
    group,
    update(t, still) {
      if (still) {
        group.rotation.y = 0;
        body.position.y = 0;
        armL.rotation.set(0, 0, 0.05);
        armR.rotation.set(0, 0, -0.05);
        legL.rotation.set(0, 0, 0);
        legR.rotation.set(0, 0, 0);
        headPivot.rotation.set(0, 0, 0);
        return;
      }

      // A slow turn rather than a spin. He is only textured on the front, so a
      // full revolution would park a blank back toward the reader for half of
      // it; +-52 degrees shows the model is solid while keeping the face on.
      group.rotation.y = Math.sin(t * 0.42) * 0.92;

      // breathing, and the weight shift that goes with it
      body.position.y = Math.sin(t * 1.6) * 0.022;
      body.rotation.z = Math.sin(t * 0.42) * 0.02;

      // arms swing out of phase with each other, with a little shoulder roll
      const swing = Math.sin(t * 1.35);
      armL.rotation.x = swing * 0.22;
      armR.rotation.x = -swing * 0.22;
      armL.rotation.z = 0.06 + Math.sin(t * 1.6) * 0.03;
      armR.rotation.z = -0.06 - Math.sin(t * 1.6) * 0.03;

      // legs barely move: he is standing, not walking
      legL.rotation.x = swing * 0.05;
      legR.rotation.x = -swing * 0.05;

      // the head leads the turn slightly and nods, which is what stops the
      // whole figure reading as one rigid object rotating on a turntable
      headPivot.rotation.y = Math.sin(t * 0.42 + 0.5) * 0.16;
      headPivot.rotation.x = Math.sin(t * 1.15) * 0.045;
    },
  };
}
