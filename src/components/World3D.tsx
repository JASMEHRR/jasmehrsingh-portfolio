import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, ZONE_X, HERO_SPOT, type ZoneKey } from '../three/buildWorld';
import { groupById, materialsFor } from '../three/blocks';
import { loadCharacter, type Character } from '../three/character';

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
 * The 3D world.
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
    host.appendChild(renderer.domElement);

    // ---- lighting ----
    const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x4a3a2a, 1.0);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4d6, 2.1);
    sun.position.set(-40, 70, 40);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(30, 20, -40);
    scene.add(fill);

    // travels with the camera so interiors and cave walls are never a void;
    // without it the obsidian stronghold renders as a black rectangle
    const lamp = new THREE.PointLight(0xffd9a0, 90, 70, 1.8);
    scene.add(lamp);

    // near and far are close together on purpose: a short fog ramp is what
    // makes distance read as haze rather than as blocks simply getting smaller
    scene.fog = new THREE.Fog(0xdcefff, 34, 128);

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

    // ---- the character ----
    // Modelled in Blender and rigged on load; see three/character.ts. He
    // stands at HERO_SPOT, which the terrain generator keeps inside the world
    // strip and clear of trees.
    let hero: Character | null = null;
    const heroX = HERO_SPOT.x;
    const heroZ = HERO_SPOT.z;
    loadCharacter()
      .then((c) => {
        hero = c;
        hero.group.scale.setScalar(5.2);
        hero.group.position.set(heroX, heightAt(heroX) + 0.5, heroZ);
        scene.add(hero.group);
      })
      .catch(() => {
        // the world is still worth showing without him
        hero = null;
      });

    // ---- drag to turn the character ----
    // Mouse only, and horizontal only: on a touch screen a drag is how you
    // scroll the page, and stealing that to spin a model would trap the
    // reader. Arrow keys do the same thing for anyone not using a mouse.
    let dragging = false;
    let lastX = 0;
    const canvas = renderer.domElement;
    canvas.style.touchAction = 'pan-y';

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !hero) return;
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || !hero) return;
      hero.turn((e.clientX - lastX) * 0.012);
      lastX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = 'grab';
    };
    const onKey = (e: KeyboardEvent) => {
      if (!hero) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === 'ArrowLeft') hero.turn(-0.35);
      else if (e.key === 'ArrowRight') hero.turn(0.35);
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);

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

    scene.background = new THREE.Color(0x6fa6ea);

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

      const blend = reduced ? 1 : 0.04;
      const bg = scene.background as THREE.Color;
      bg.lerp(target.sky, blend);
      (scene.fog as THREE.Fog).color.lerp(target.fog, blend);
      sun.color.lerp(target.sun, blend);
      hemi.color.lerp(target.ambient, blend);
      sun.intensity += (target.intensity - sun.intensity) * blend;

      if (!reduced) {
        moteCloud.rotation.y = t * 0.04;
        moteMat.opacity = 0.55 + Math.sin(t * 1.6) * 0.25;
      }

      // eases toward whatever angle the reader has dragged him to
      hero?.update();

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(moodTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      renderer.dispose();
      geo.dispose();
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
