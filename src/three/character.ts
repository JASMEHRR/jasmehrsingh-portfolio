import * as THREE from 'three';

/**
 * Builds the character from the reference render itself.
 *
 * Earlier versions approximated him: cube colours tuned by eye, a face drawn as
 * a 16x16 pixel map, an afro generated from an ellipsoid. Every round got
 * closer and none of them matched, because a hand-authored approximation of a
 * render is always a guess at it.
 *
 * This takes the opposite approach. tools/extract_character.py cuts the actual
 * pixels out of public/avatar.png into public/char/*.png, and samples the
 * reference's own hair mask into hair.json. The face here is therefore the face
 * in the render — same glasses, same beard, same eyes — and the afro's outline
 * is the outline that was drawn, not one fitted to it.
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

/** px per world unit, derived from the face box mapping onto the head cube */
const PPU = 660;
const HEAD_CENTRE_Y = 1.75;

function pixelTexture(loader: THREE.TextureLoader, url: string) {
  const t = loader.load(url);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Six materials for a box, in three.js face order (+x, -x, +y, -y, +z, -z).
 * Only the +z face carries the photo; the rest are the flat colour sampled
 * from the same region, so the sides read as the same garment without needing
 * crops the reference never showed us.
 */
function boxMaterials(front: THREE.Texture, side: number, top = side, bottom = side) {
  const flat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  return [
    flat(side),
    flat(side),
    flat(top),
    flat(bottom),
    new THREE.MeshLambertMaterial({ map: front }),
    flat(side),
  ];
}

export function buildCharacter(mask: HairMask): THREE.Group {
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();

  const faceTex = pixelTexture(loader, '/char/face.png');
  const torsoTex = pixelTexture(loader, '/char/torso.png');
  const legsTex = pixelTexture(loader, '/char/legs.png');
  const armLTex = pixelTexture(loader, '/char/arm_left.png');
  const armRTex = pixelTexture(loader, '/char/arm_right.png');

  // colours sampled from the reference, used for the faces it never showed
  const SKIN = 0xf4995d;
  const SHIRT = 0x201e20;
  const PANTS = 0x312f32;

  // ---- head, wearing the real face on its front ----
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    boxMaterials(faceTex, SKIN),
  );
  head.position.set(0, HEAD_CENTRE_Y, 0);
  group.add(head);

  // ---- torso ----
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.75, 0.26),
    boxMaterials(torsoTex, SHIRT),
  );
  torso.position.set(0, 1.125, 0);
  group.add(torso);

  // ---- arms ----
  const armGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
  const armL = new THREE.Mesh(armGeo, boxMaterials(armLTex, SKIN, SHIRT, SKIN));
  armL.position.set(-0.378, 1.125, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, boxMaterials(armRTex, SKIN, SHIRT, SKIN));
  armR.position.set(0.378, 1.125, 0);
  group.add(armR);

  // ---- legs, as one box so the texture reads across both ----
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.75, 0.26),
    boxMaterials(legsTex, PANTS, PANTS, 0xa99da0),
  );
  legs.position.set(0, 0.375, 0);
  group.add(legs);

  // ---- the afro, placed from the reference's own hair mask ----
  const [hx0, hy0, hx1] = mask.headRegion;
  const [fx0, fy0, fx1, fy1] = mask.faceBox;
  const faceCx = (fx0 + fx1) / 2;
  const faceCy = (fy0 + fy1) / 2;

  const cellW = (hx1 - hx0) / mask.cols;
  const cellH = (mask.headRegion[3] - hy0) / mask.rows;
  const sizeX = cellW / PPU;
  const sizeY = cellH / PPU;
  const cube = Math.max(sizeX, sizeY) * 1.15;

  // half-extents of the mask in world units, for the depth falloff
  const RX = (hx1 - hx0) / 2 / PPU;
  const RY = (mask.headRegion[3] - hy0) / 2 / PPU;
  const DEPTH = 0.30;

  type Curl = { x: number; y: number; z: number; tone: number };
  const curls: Curl[] = [];

  for (let gy = 0; gy < mask.rows; gy++) {
    for (let gx = 0; gx < mask.cols; gx++) {
      if (!mask.grid[gy][gx]) continue;

      const imgX = hx0 + (gx + 0.5) * cellW;
      const imgY = hy0 + (gy + 0.5) * cellH;
      const wx = (imgX - faceCx) / PPU;
      const wy = HEAD_CENTRE_Y - (imgY - faceCy) / PPU;

      // how far this curl can bulge toward the viewer, from how central it is
      const nx = wx / RX;
      const ny = (wy - HEAD_CENTRE_Y) / RY;
      const inside = Math.max(0, 1 - nx * nx - ny * ny);
      const d = Math.sqrt(inside) * DEPTH;

      const tone = mask.tone[gy][gx] || 24;

      // Nothing may bulge forward across the face: the head's front plane is
      // at z=0.25 and carries the real photo, so a curl in front of it hides
      // the glasses and beard. Cells over the face get back-shell curls only.
      const overFace = Math.abs(wx) < 0.28 && wy < 2.03;

      // front and back shells only: a solid interior costs thousands of cubes
      // that are never visible from any angle the camera can reach
      if (!overFace) curls.push({ x: wx, y: wy, z: d, tone });
      if (d > 0.06) curls.push({ x: wx, y: wy, z: -d, tone: tone * 0.75 });
      // a middle ring on the silhouette edge, so the outline has thickness
      if (inside < 0.25) curls.push({ x: wx, y: wy, z: 0, tone: tone * 0.9 });
    }
  }

  const hairGeo = new THREE.BoxGeometry(cube, cube, cube);
  // Base colour is the reference's hair, not white. Per-instance colour is a
  // multiplier on top for curl-to-curl variation, so if instanceColor is ever
  // unsupported the hair is still black rather than a grey wig.
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x171212 });
  const hair = new THREE.InstancedMesh(hairGeo, hairMat, curls.length);
  const dummy = new THREE.Object3D();
  const colour = new THREE.Color();

  curls.forEach((c, i) => {
    // a little scatter so the surface is lumpy rather than a tidy shell
    const j = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    dummy.position.set(c.x + j * 0.012, c.y + j * 0.012, c.z + j * 0.02);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(0.9 + Math.abs(j) * 0.35);
    dummy.updateMatrix();
    hair.setMatrixAt(i, dummy.matrix);
    // tone comes from the reference pixel, used as a multiplier around 1.0.
    // Median hair tone there is 22/255, so dividing by that keeps the mid
    // curls at full base colour and lets the lit ones brighten a little.
    const v = Math.min(2.2, Math.max(0.45, c.tone / 22));
    colour.setRGB(v, v * 0.95, v * 0.92);
    hair.setColorAt(i, colour);
  });
  hair.instanceMatrix.needsUpdate = true;
  if (hair.instanceColor) hair.instanceColor.needsUpdate = true;
  group.add(hair);

  return group;
}
