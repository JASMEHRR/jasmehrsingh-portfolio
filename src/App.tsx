import { lazy, Suspense } from 'react';
import { currentMode } from './route';
import GlassApp from './glass/GlassApp';

// The two heavier front ends are separate chunks. The glass portfolio is what
// most visitors see, and it should not pay for three.js to load.
const MinecraftApp = lazy(() => import('./MinecraftApp'));
const EditApp = lazy(() => import('./EditApp'));

/**
 * Three pages, picked by path.
 *
 * Checked directly rather than through a router: a router would be a
 * dependency for three fixed paths, and Netlify's SPA fallback already serves
 * each of them as index.html.
 */
export default function App() {
  const mode = currentMode();
  if (mode === 'glass') return <GlassApp />;

  return (
    <Suspense fallback={null}>
      {mode === 'minecraft' ? <MinecraftApp /> : <EditApp />}
    </Suspense>
  );
}
