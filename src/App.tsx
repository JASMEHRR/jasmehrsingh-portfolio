import { lazy, Suspense } from 'react';
import { currentMode } from './route';
import GlassApp from './glass/GlassApp';

// The Minecraft world is a separate chunk. The glass portfolio is what most
// visitors see, and it should not pay for three.js to load.
const MinecraftApp = lazy(() => import('./MinecraftApp'));

/**
 * Two pages, picked by path.
 *
 * Checked directly rather than through a router: a router would be a
 * dependency for two fixed paths, and Netlify's SPA fallback already serves
 * both of them as index.html.
 */
export default function App() {
  if (currentMode() === 'glass') return <GlassApp />;

  return (
    <Suspense fallback={null}>
      <MinecraftApp />
    </Suspense>
  );
}
