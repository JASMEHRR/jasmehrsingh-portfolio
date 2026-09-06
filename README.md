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

The background is a single fixed element (`components/World.tsx`) made entirely
of CSS gradients — no images, so it costs nothing to load and stays crisp at any
zoom. Every layer's visibility is a `--l-*` custom property.

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
  components/
    World.tsx              <- the CSS-only backdrop
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
  avatar.png               <- the skin render used in the hero
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

- `lucide-react` is pinned to `0.x` — v1 removed the GitHub/LinkedIn brand icons.
- `public/profile.json` feeds the `/arcade` page only; the React site reads
  `src/data/portfolio.json`. Update both if a role changes.
