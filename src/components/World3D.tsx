import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, ZONE_X, type ZoneKey } from '../three/buildWorld';
import { groupById, materialsFor } from '../three/blocks';

/**
 * Sky, fog and light per district.
 *
 * The hours run forward as you travel: morning over the square, noon at the
 * library, a golden afternoon at the workshops, dusk in the market, lamplight
 * at the mine, blossom-pink evening in the gardens, and night at the docks.
 * Tying the palette to a time of day rather than picking pretty colours per
 * section is what keeps seven very different moods feeling like one place.
 *
 * Fog is deliberately close and strongly tinted. It is doing the heavy lifting
 * for the dreaminess: distant blocks wash toward the sky colour, which softens
 * the grid without blurring anything up close.
 */
const MOOD: Record<string, { sky: number; fog: number; sun: number; ambient: number; intensity: number }> = {
  overworld: { sky: 0x8ec6f0, fog: 0xdcefff, sun: 0xfff0cf, ambient: 0xa8d2f5, intensity: 2.3 },
  enchant: { sky: 0x5b8fe0, fog: 0xc9e2ff, sun: 0xffffff, ambient: 0x9dc4f2, intensity: 2.6 },
  craft: { sky: 0xf0a95e, fog: 0xffd9a8, sun: 0xffc477, ambient: 0xe0a070, intensity: 2.4 },
  cave: { sky: 0xd97a58, fog: 0xf0a878, sun: 0xffb066, ambient: 0xc07a5c, intensity: 2.0 },
  cherry: { sky: 0xf6b8d4, fog: 0xffd9e8, sun: 0xfff0f6, ambient: 0xf2c0d8, intensity: 2.2 },
  night: { sky: 0x1e2a5e, fog: 0x2b3a76, sun: 0xa8bcff, ambient: 0x5a6ba8, intensity: 1.4 },
};

const ZONE_FOR_SECTION: Record<string, ZoneKey> = {
  home: 'home',
  skills: 'skills',
  experience: 'experience',
  projects: 'projects',
  mine: 'mine',
  about: 'about',
  contact: 'contact',
};

/**
 * The 3D backdrop.
 *
 * Scenery, and nothing else. It used to have the character standing in it,
 * which quietly asked the reader to treat it as a real place they were looking
 * into - so it had to be consistent, and he had to be found in it rather than
 * showing you around. He now lives in his own canvas beside the page (see
 * Guide.tsx) and this is free to be purely decorative.
 *
 * Terrain is one InstancedMesh per block type, so ~9k cubes cost a handful of
 * draw calls rather than thousands. The camera does not orbit or free-fly: it
 * tracks scroll along a fixed path through the landscape, which keeps the
 * whole thing navigable with a mouse wheel, a touch swipe or a Page Down key
 * and never traps anyone in a viewport they cannot get out of.
 *
 * Callers are responsible for not mounting this at all when WebGL is missing
 * or reduced motion is requested; see World.tsx.
 */
export default function World3D() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // reduced motion keeps the world but takes away the movement: the camera
    // cuts between zones instead of gliding, and nothing drifts on its own
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    // capped: a voxel scene gains nothing from a 3x buffer and it is the
    // single biggest cost on a high-DPI laptop
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Shadows are the single largest thing separating this from a flat
    // diorama: without them nothing sits on the ground, buildings look pasted
    // on, and the character floats. One extra depth pass buys all of it.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    // ---- lighting ----
    // Ambient is deliberately low. It was 1.0, which lit every face of every
    // cube to nearly the same value and flattened the whole scene; the sun
    // now does most of the work so faces separate and shadows have somewhere
    // dark to fall.
    const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x4a3a2a, 0.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4d6, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    // The shadow camera is a tight box that travels with the view rather than
    // one big enough for the whole town: a 400-unit-wide map would give each
    // block a handful of texels and the shadows would be mush.
    const shadowSpan = 46;
    sun.shadow.camera.left = -shadowSpan;
    sun.shadow.camera.right = shadowSpan;
    sun.shadow.camera.top = shadowSpan;
    sun.shadow.camera.bottom = -shadowSpan;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    sun.shadow.bias = -0.0015;
    sun.shadow.normalBias = 0.05;
    // Required. three.js never rebuilds an ortho shadow camera's projection
    // after its bounds are set, so without this the map covers the default
    // two-unit box and the scene renders with shadows on and none visible.
    sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun);
    scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0xffffff, 0.28);
    fill.position.set(-30, 20, 40);
    scene.add(fill);

    // travels with the camera so interiors and cave walls are never a void;
    // without it the obsidian stronghold renders as a black rectangle
    const lamp = new THREE.PointLight(0xffd9a0, 90, 70, 1.8);
    scene.add(lamp);

    // Near and far are close together on purpose: a short fog ramp is what
    // makes distance read as haze rather than as blocks simply getting
    // smaller. Pulled in further now that this is only ever scenery - the
    // page is what should hold the eye, and a backdrop that stays crisp to the
    // horizon competes with the words in front of it.
    scene.fog = new THREE.Fog(0xdcefff, 24, 96);

    // ---- terrain ----
    const { blocks, heightAt } = buildWorld();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const dummy = new THREE.Object3D();
    const meshes: THREE.InstancedMesh[] = [];

    for (const [id, list] of groupById(blocks)) {
      const mesh = new THREE.InstancedMesh(geo, materialsFor(id), list.length);
      list.forEach((b, i) => {
        dummy.position.set(b.x, b.y, b.z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      // water casting a shadow reads as a hole in the ground, and glass and
      // lantern are the light sources, so none of the three should occlude
      mesh.castShadow = id !== 'water' && id !== 'glass' && id !== 'lantern';
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
    }

    // glowing motes over the enchanting room, the one bit of pure atmosphere
    const moteGeo = new THREE.BufferGeometry();
    const motes = 220;
    const pos = new Float32Array(motes * 3);
    for (let i = 0; i < motes; i++) {
      pos[i * 3] = ZONE_X.skills + (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = heightAt(ZONE_X.skills) + 1 + Math.random() * 9;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const moteMat = new THREE.PointsMaterial({ color: 0xd4a6ff, size: 0.28, transparent: true, opacity: 0.9 });
    const moteCloud = new THREE.Points(moteGeo, moteMat);
    scene.add(moteCloud);

    // ---- camera path, driven by which section is on screen ----
    type Stop = { top: number; x: number };
    let stops: Stop[] = [];

    const measure = () => {
      const found: Stop[] = [];
      for (const [id, zone] of Object.entries(ZONE_FOR_SECTION)) {
        const el = document.getElementById(id);
        if (!el) continue;
        found.push({ top: el.offsetTop + el.offsetHeight / 2, x: ZONE_X[zone] });
      }
      stops = found.sort((a, b) => a.top - b.top);
    };

    /** World X for the current scroll position, interpolated between stops. */
    const worldX = () => {
      if (stops.length === 0) return 0;
      const y = window.scrollY + window.innerHeight / 2;
      if (y <= stops[0].top) return stops[0].x;
      const last = stops[stops.length - 1];
      if (y >= last.top) return last.x;
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        if (y >= a.top && y <= b.top) {
          const t = (y - a.top) / Math.max(1, b.top - a.top);
          const eased = t * t * (3 - 2 * t); // smoothstep, so arrivals settle
          return a.x + (b.x - a.x) * eased;
        }
      }
      return last.x;
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      measure();
    };
    resize();
    window.addEventListener('resize', resize);

    // ---- mood transitions ----
    const target = { sky: new THREE.Color(0x6fa6ea), fog: new THREE.Color(0xbfe0ff), sun: new THREE.Color(0xfff4d6), ambient: new THREE.Color(0x8fb7ee), intensity: 2.1 };
    const applyMood = () => {
      const m = MOOD[document.documentElement.dataset.biome ?? 'overworld'] ?? MOOD.overworld;
      target.sky.setHex(m.sky);
      target.fog.setHex(m.fog);
      target.sun.setHex(m.sun);
      target.ambient.setHex(m.ambient);
      target.intensity = m.intensity;
    };
    applyMood();
    const moodTimer = window.setInterval(applyMood, 200);

    // ---- sky ----
    // A flat background colour meets the ground in a hard line and gives the
    // horizon nothing to be. This is a dome shaded from the fog colour at the
    // horizon to the sky colour overhead: because the bottom of the gradient
    // *is* the fog colour, distant ground dissolves into the sky instead of
    // stopping against it, which is the whole trick behind the haze.
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x6fa6ea) },
        bottom: { value: new THREE.Color(0xbfe0ff) },
      },
      vertexShader: `
        varying float vH;
        void main() {
          vH = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 top;
        uniform vec3 bottom;
        varying float vH;
        void main() {
          gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.05, 0.6, vH)), 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), skyMat);
    sky.frustumCulled = false;
    scene.add(sky);

    // A disc for the sun and a soft halo around it. The scene has a key light
    // coming from somewhere; showing where anchors the whole lighting scheme
    // and gives the empty half of the frame something to be.
    const sunDisc = new THREE.Group();
    const discMat = new THREE.MeshBasicMaterial({ color: 0xfff4d6, fog: false });
    sunDisc.add(new THREE.Mesh(new THREE.CircleGeometry(9, 24), discMat));
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfff0cf,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    sunDisc.add(new THREE.Mesh(new THREE.CircleGeometry(26, 24), haloMat));
    sunDisc.renderOrder = -1;
    scene.add(sunDisc);

    // ---- render loop ----
    let raf = 0;
    let camX = worldX();
    const clock = new THREE.Clock();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      // ease toward the scroll target so fast flicks glide instead of snapping
      camX = reduced ? worldX() : camX + (worldX() - camX) * 0.06;
      const groundY = heightAt(camX);

      camera.position.set(camX - 13, groundY + 9.5, 20);
      camera.lookAt(camX + 4, groundY + 2.5, 0);
      lamp.position.set(camX - 2, groundY + 10, 12);

      // The key light and its shadow box travel with the view, so the tight
      // high-resolution shadow map is always spent on what is actually on
      // screen rather than on the far end of the town.
      // Behind and to the right of the view, never behind the camera. Lit from
      // over the reader's shoulder every shadow falls away from them and hides
      // behind the thing casting it, which is how the scene managed to have a
      // shadow map and still look completely flat.
      sun.position.set(camX + 52, groundY + 64, -38);
      sun.target.position.set(camX + 2, groundY, 2);
      sun.target.updateMatrixWorld();

      // the dome and the sun disc are backdrop, not scenery: they ride with
      // the camera so neither is ever approached or passed
      sky.position.copy(camera.position);
      sunDisc.position.copy(camera.position).addScaledVector(
        sun.position.clone().sub(sun.target.position).normalize(), 240,
      );
      sunDisc.lookAt(camera.position);

      const blend = reduced ? 1 : 0.04;
      skyMat.uniforms.top.value.lerp(target.sky, blend);
      skyMat.uniforms.bottom.value.lerp(target.fog, blend);
      discMat.color.lerp(target.sun, blend);
      haloMat.color.lerp(target.sun, blend);
      (scene.fog as THREE.Fog).color.lerp(target.fog, blend);
      sun.color.lerp(target.sun, blend);
      hemi.color.lerp(target.ambient, blend);
      sun.intensity += (target.intensity - sun.intensity) * blend;

      if (!reduced) {
        moteCloud.rotation.y = t * 0.04;
        moteMat.opacity = 0.55 + Math.sin(t * 1.6) * 0.25;
      }

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(moodTimer);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      geo.dispose();
      sky.geometry.dispose();
      skyMat.dispose();
      sunDisc.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
      discMat.dispose();
      haloMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      meshes.forEach((m) => {
        m.dispose();
        const mm = m.material;
        if (Array.isArray(mm)) mm.forEach((x) => x.dispose());
        else mm.dispose();
      });
      host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={hostRef} className="fixed inset-0 z-0" aria-hidden />;
}
