import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadCharacter, type Character } from '../three/character';
import { usePortfolio } from '../hooks/usePortfolio';
import { is3DWorld } from '../three/mode';

/**
 * JasMehr, standing beside the page rather than inside it.
 *
 * He used to be a model placed on the terrain of the 3D world, scaled up and
 * stood on a block. That was the wrong idea twice over: it made the backdrop
 * into a place you were expected to read as real, and it buried him in it, so
 * he was something you found in the scenery instead of someone showing you
 * around. He is a person, not set dressing.
 *
 * So he gets his own canvas: his own scene, his own camera, his own light,
 * transparent background, sitting above the page and below nothing. The world
 * behind him no longer knows he exists, which means the world can be as loose
 * and decorative as it likes without dragging his lighting around with it.
 *
 * He is lit as a portrait, not as terrain - a soft key from the front left, a
 * cool rim behind to lift his edge off whatever colour the backdrop happens to
 * be. That is why this does not reuse the world's lights.
 */

/** Big enough to read his face, small enough to leave the column alone. */
const WIDTH = 300;
const HEIGHT = 460;

export default function Guide() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { game } = usePortfolio();
  const [biome, setBiome] = useState('overworld');
  const [ready, setReady] = useState(false);

  // The line he says follows the same attribute the backdrop reads, so his
  // commentary and the scenery can never disagree about where you are.
  useEffect(() => {
    const read = () => setBiome(document.documentElement.dataset.biome ?? 'overworld');
    read();
    const timer = window.setInterval(read, 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, WIDTH / HEIGHT, 0.1, 100);
    camera.position.set(0, 1.05, 6.2);
    camera.lookAt(0, 0.95, 0);

    // alpha, and no background: the page and the world show through around
    // him, which is what stops this reading as a picture pasted on top
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(WIDTH, HEIGHT, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    // portrait lighting, deliberately unlike the world's
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a5a4a, 1.15));
    const key = new THREE.DirectionalLight(0xfff3dd, 2.0);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd8ff, 1.1);
    rim.position.set(3.5, 2, -4);
    scene.add(rim);

    let hero: Character | null = null;
    let raf = 0;

    loadCharacter()
      .then((c) => {
        hero = c;
        // framed head-to-foot: he is about 2 units tall in his own space
        hero.group.position.set(0, -1.05, 0);
        scene.add(hero.group);
        setReady(true);
      })
      .catch(() => setReady(false));

    // ---- drag to turn him ----
    // Mouse only and horizontal only, for the same reason as before: on a
    // touch screen a drag is how you scroll, and stealing that would trap the
    // reader on top of a decoration.
    const canvas = renderer.domElement;
    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';
    let dragging = false;
    let lastX = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !hero) return;
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || !hero) return;
      hero.turn((e.clientX - lastX) * 0.014);
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

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      hero?.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      renderer.dispose();
      host.removeChild(canvas);
    };
  }, []);

  // He needs WebGL and room to stand in; below that the page is the point and
  // a 300px figure beside a single column would simply be in the way.
  if (!is3DWorld()) return null;

  return (
    <div className="pointer-events-none fixed bottom-0 right-4 z-20 hidden select-none xl:block">
      <div
        className={`mb-2 ml-auto max-w-[17rem] rounded-md border-2 border-black/70 bg-black/75 px-3 py-2 font-mono text-[0.8rem] leading-snug text-white shadow-lg transition-opacity duration-300 ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {game.guide[biome] ?? game.guide.overworld}
      </div>
      <div
        ref={hostRef}
        className="pointer-events-auto"
        style={{ width: WIDTH, height: HEIGHT }}
        aria-hidden
      />
    </div>
  );
}
