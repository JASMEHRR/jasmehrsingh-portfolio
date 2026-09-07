import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, ZONE_X, type ZoneKey } from '../three/buildWorld';
import { groupById, materialsFor } from '../three/blocks';
import { buildCharacter, type HairMask } from '../three/character';

/** Sky, fog and light per biome, matched to the 2D palette. */
const MOOD: Record<string, { sky: number; fog: number; sun: number; ambient: number; intensity: number }> = {
  overworld: { sky: 0x6fa6ea, fog: 0xbfe0ff, sun: 0xfff4d6, ambient: 0x8fb7ee, intensity: 2.1 },
  enchant: { sky: 0x2b1a52, fog: 0x3a2270, sun: 0xd9b3ff, ambient: 0x6a4aa8, intensity: 2.6 },
  craft: { sky: 0x8a6032, fog: 0xa9793f, sun: 0xffc98a, ambient: 0x6b4a24, intensity: 1.9 },
  cave: { sky: 0x1b1b24, fog: 0x15151d, sun: 0xffc891, ambient: 0x4a4a5c, intensity: 1.9 },
  cherry: { sky: 0x8fb7ee, fog: 0xf3cfe4, sun: 0xfff0f6, ambient: 0xf3cfe4, intensity: 2.1 },
  night: { sky: 0x16204a, fog: 0x1e2a5c, sun: 0xc3d0ff, ambient: 0x46568f, intensity: 1.5 },
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

    scene.fog = new THREE.Fog(0xbfe0ff, 40, 150);

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
    // Built in code from the reference render's own pixels rather than loaded
    // as a model: see three/character.ts. The face is a crop of avatar.png and
    // the afro is placed from that image's hair mask, which is what makes it
    // match rather than merely resemble.
    let hero: THREE.Group | null = null;
    const heroX = ZONE_X.home + 5;
    const heroZ = 11;
    fetch('/char/hair.json')
      .then((r) => r.json())
      .then((mask: HairMask) => {
        hero = buildCharacter(mask);
        hero.scale.setScalar(3.2);
        hero.position.set(heroX, heightAt(heroX) + 0.5, heroZ);
        scene.add(hero);
      })
      .catch(() => {
        // the world is still worth showing without him
        hero = null;
      });

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

      if (hero) {
        // face the camera, and breathe, unless motion is unwelcome
        const dx = camera.position.x - hero.position.x;
        const dz = camera.position.z - hero.position.z;
        hero.rotation.y = Math.atan2(dx, dz);
        hero.position.y =
          heightAt(heroX) + 0.5 + (reduced ? 0 : Math.sin(t * 1.5) * 0.06);
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
