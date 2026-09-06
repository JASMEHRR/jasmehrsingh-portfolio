import { useBiome } from './hooks/useBiome';
import { useReveal } from './hooks/useReveal';
import World from './components/World';
import Editor from './components/Editor';
import Hud from './components/Hud';
import Hotbar from './components/Hotbar';
import HeroProfile from './components/HeroProfile';
import EnchantSkills from './components/EnchantSkills';
import CraftingJourney from './components/CraftingJourney';
import ChestProjects from './components/ChestProjects';
import MiniMine from './components/MiniMine';
import Advancements from './components/Advancements';
import ContactSign from './components/ContactSign';

export default function App() {
  useBiome();
  useReveal();

  // one route, checked directly: a router would be a dependency for a single
  // extra page, and Netlify's SPA fallback already serves /edit as index.html
  if (window.location.pathname.replace(/\/$/, '') === '/edit') {
    return (
      <>
        <World />
        <Editor />
      </>
    );
  }

  return (
    <>
      <World />
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-black focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Hud />
      <main className="relative z-10 pb-28">
        <HeroProfile />
        <EnchantSkills />
        <CraftingJourney />
        <ChestProjects />
        <MiniMine />
        <Advancements />
        <ContactSign />
      </main>
      <Hotbar />
    </>
  );
}
