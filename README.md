# JasMehr Singh — Portfolio

A personal portfolio built as a Minecraft world. React 18 + TypeScript + Vite +
Tailwind, with every piece of content decoupled into JSON.

The conceit: you are looking at a player's save file. Skills are enchantments,
experience is crafting recipes, projects are chest loot, education is the
advancements screen, and the numbers are literally buried in a wall you dig.

## Install

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build into dist/
npm run preview  # serve the built output
```

## The world

The backdrop is a real 3D voxel landscape rendered with three.js
(`components/World3D.tsx`). Terrain is one `InstancedMesh` per block type —
about 15,000 cubes in 19 draw calls — textured with the same 16x16 pixel-art
PNGs the flat version uses, sampled with `NearestFilter` so they stay blocky
rather than smeared. That filter setting is the single most important detail
for making WebGL look like Minecraft instead of a low-res render.

The camera never free-flies. It tracks scroll along a fixed path through one
continuous landscape, so the site stays navigable with a wheel, a swipe or Page
Down, and nobody gets trapped in a viewport they cannot leave. Zones are laid
out along X (`three/buildWorld.ts`) with a landmark each: a stronghold ringed
with bookshelves, a plank workshop, ore seams in a sunken basin, a cherry grove.

`components/World2D.tsx` is the CSS-gradient fallback, used when WebGL is
missing or on screens under 768px. It is a genuine fallback: same biomes, same
palette, same textures, just flat.

Reduced motion does **not** drop to 2D. The preference asks for less movement,
not less world, so the 3D scene still renders — the camera cuts between zones
instead of gliding and the particles stop drifting. Dropping the scene entirely
would hide the site's main idea from exactly the people who have the preference
switched on.

Layer visibility in the 2D world is driven by `--l-*` custom properties.

Each `<section>` carries a `data-biome`. `hooks/useBiome.ts` finds whichever
section is nearest the middle of the viewport and copies its biome onto `<html>`,
where `index.css` swaps the sky, the ground and every layer opacity. Scrolling
therefore walks you through the world rather than past a static picture.

| Section | Biome | What you see |
| --- | --- | --- |
| Profile | `overworld` | Day sky, grass, trees |
| Skills | `enchant` | Stronghold, obsidian pillars, rising glyphs |
| Journey | `craft` | Warm workshop light, torches |
| Projects | `cave` | Deepslate, ore glints, torchlight |
| The Mine | `cave` | Same |
| Advancements | `cherry` | Cherry grove, pink canopy |
| Contact | `night` | Night sky, stars, torches |

To add a biome: add a `[data-biome='name']` block in `index.css` setting the sky,
`--ground` and the layer opacities, then put that name on a section.

## Structure

```
src/
  data/portfolio.json      <- ALL content lives here
  types/portfolio.ts       <- types for that JSON
  hooks/
    usePortfolio.ts        <- typed accessor; components use only this
    useBiome.ts            <- section -> world backdrop
    useReveal.ts           <- scroll reveals, progressive enhancement
    usePointer.ts          <- cursor parallax, off under reduced motion
  three/
    blocks.ts              <- block palette, textures, materials
    buildWorld.ts          <- terrain and structure generation
  components/
    World.tsx              <- picks 3D or 2D
    World3D.tsx            <- three.js voxel world
    World2D.tsx            <- CSS-gradient fallback
    Hud.tsx                <- hearts, coords, XP bar (doubles as scroll progress)
    Hotbar.tsx             <- bottom nav, number keys 1-8
    HeroProfile.tsx        <- stats left, character right
    EnchantSkills.tsx      <- skills as enchantments
    CraftingJourney.tsx    <- experience as 3x3 recipes
    ChestProjects.tsx      <- projects as a 9x3 chest
    MiniMine.tsx           <- the playable stats wall
    Advancements.tsx       <- education + services
    ContactSign.tsx        <- contact, on an oak sign
    mc/Gui.tsx             <- Panel, Slot, Block, Hearts, XpBar, EnchantRow
public/
  character.glb            <- the voxel character, modelled in Blender
  avatar.png               <- flat render, used only by the 2D fallback
  arcade/index.html        <- the standalone playable arcade, served at /arcade
  profile.json             <- content source for the arcade page only
```

## Editing content

Open `src/data/portfolio.json`. Nothing else needs to change.

- **New job** — add to `experience[]`. The recipe grid fills one slot per highlight.
- **New project** — add to `projects[]` with `color`, `rarity` and `material`.
  `"highlight": true` pins it first and adds a star. Empty `link` shows
  "Private — in development" instead of a dead button.
- **New skill** — add to the relevant `skills.categories[].items[]` as
  `{ name, level }`, level 1-5, rendered as roman numerals.
- **New buried stat** — add to `game.ores[]`. The mine lays them out automatically.
- **Splash text** — `game.splashes[]`, one picked at random per load.

## Accessibility

This is a game-themed site, not a game, so it has to stay usable:

- The mine has a "Reveal every ore" button, so no content is locked behind play.
- Every slot and block has an accessible name; decorative layers are `aria-hidden`.
- The hotbar is real links with `aria-current`, navigable by keyboard, plus
  number-key shortcuts that are ignored while typing in a field.
- All body text passes WCAG AA. `--ink-soft` is 5.3:1 and `--ench-ink` 5.5:1 on
  the `#c6c6c6` panel; the glow purple `--ench` is for dark grounds only.
- `prefers-reduced-motion` stops the world transitions, the bob, the flicker,
  the cursor parallax and the scroll reveals. `useReveal` only ever *adds* the
  hiding class when motion is welcome, so the failure mode is "no animation",
  never "no content".

## The character's idle

He turns, breathes and swings his arms, driven by `Character.update` in
`three/character.ts`. Limbs hang from their own pivots: the geometry is shifted
so each mesh's origin sits at the shoulder or hip, because rotating a centred
box swings it around its middle and scissors an arm through the shoulder.

The turn is +-52 degrees rather than a full revolution. He is only textured on
the front, so a full spin would park a blank back toward the reader for half of
every cycle.

This idle is **opt-out, not reduced-motion-gated** — see the Motion toggle,
bottom right. Gating it on the OS preference hid the feature from the person
who asked for it. Everything tied to scrolling (camera travel, reveals,
parallax) stays gated, because that is the motion the preference exists to
prevent.

`HERO_SPOT` in `three/buildWorld.ts` fixes where he stands. It lives with the
terrain because the terrain has to know: z must be inside the strip or he
stands on nothing, and the scenery pass has to leave him a clearing rather than
growing a tree through him.

## Motion

Do not reach for Framer's `MotionConfig reducedMotion="user"` here. It disables
the transform but leaves elements parked on their `initial` opacity of 0, which
renders the page blank for anyone with the preference on.

## Deploying

`netlify.toml` sets the build command, `dist` as publish dir and Node 20. The SPA
fallback is listed last so the rules above it win: `/arcade/*` and `/profile.json`
resolve as real files, because the arcade page fetches `../profile.json` at
runtime and a catch-all would otherwise hand it `index.html`.

## Notes

- The character is built in code from the reference render itself
  (`three/character.ts`), not modelled by hand and not loaded as a GLB. Run
  `python tools/extract_character.py` to regenerate `public/char/` — it crops
  the face, torso, arms and legs straight out of `public/avatar.png` and samples
  that image's hair mask into `hair.json`. The face on the model is therefore
  the face in the render, and the afro's outline is the outline that was drawn.
  Four rounds of hand-tuning cube colours never matched it; reading the pixels
  did, first try. `three/mode.ts` decides 3D-vs-2D once so the hero knows to
  leave the flat cut-out out of the HTML rather than showing him twice.
- `three` is loaded in its own lazy chunk (~125KB gzip) so anyone who gets the
  2D fallback never downloads it.
- Textures are generated, not extracted: run `python tools/make_textures.py` to
  regenerate `public/tex`. They are original pixel art in the game's style,
  which is what keeps them ours to ship.
- `lucide-react` is pinned to `0.x` — v1 removed the GitHub/LinkedIn brand icons.
- `public/profile.json` feeds the `/arcade` page only; the React site reads
  `src/data/portfolio.json`. Update both if a role changes.
