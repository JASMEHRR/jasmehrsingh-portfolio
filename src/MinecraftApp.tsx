import { useEffect } from 'react';
import { useBiome } from './hooks/useBiome';
import { useReveal } from './hooks/useReveal';
import World from './components/World';
import Guide from './components/Guide';
import Hud from './components/Hud';
import Hotbar from './components/Hotbar';
import HeroProfile from './components/HeroProfile';
import EnchantSkills from './components/EnchantSkills';
import CraftingJourney from './components/CraftingJourney';
import ChestProjects from './components/ChestProjects';
import MiniMine from './components/MiniMine';
import Advancements from './components/Advancements';
import ContactSign from './components/ContactSign';

/**
 * The Minecraft world, served at /minecraft.
 *
 * This was the whole site until the glass portfolio took over /. It is loaded
 * as its own chunk, so three.js, the character model and the voxel world are
 * only downloaded by people who choose to come here.
 */
export default function MinecraftApp() {
  useBiome();
  useReveal();

  useEffect(() => {
    const previous = document.title;
    document.title = 'JasMehr Singh | Minecraft mode';
    return () => {
      document.title = previous;
    };
  }, []);

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
      {/* The way back, worded as the pause menu words it. The HUD is
          aria-hidden and ignores the pointer, so this sits beside it rather
          than inside it. */}
      <a
        href="/"
        className="mc-btn fixed left-4 top-10 z-40 px-3 py-2 text-[8px]"
      >
        Save &amp; Quit to Title
      </a>
      <Guide />
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
