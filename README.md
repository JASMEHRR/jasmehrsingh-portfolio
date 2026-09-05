# JasMehr Singh — Portfolio

Single-page personal portfolio. Built to the structure in *Building a Portfolio with AI —
Prompt Guide* (Arvind Singh): React 18 + TypeScript + Vite + Tailwind + Framer Motion +
lucide-react, with every piece of content decoupled into JSON.

## Install

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build into dist/
npm run preview  # serve the built output
```

## Scripts

| Script            | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Vite dev server with HMR                      |
| `npm run build`   | `tsc -b` typecheck, then `vite build`         |
| `npm run preview` | Serves `dist/` locally                        |

## Structure

```
src/
  data/portfolio.json      <- ALL content lives here
  types/portfolio.ts       <- types for that JSON
  hooks/usePortfolio.ts    <- typed accessor; components use only this
  hooks/useEntrance.ts     <- entrance animation props; disabled under
                              prefers-reduced-motion
  components/
    Navbar.tsx
    SocialLinks.tsx
    HeroSection.tsx
    AboutSection.tsx
    ExperienceSection.tsx
    ServicesSection.tsx
    ProjectsSection.tsx
    ProjectCard.tsx
    TestimonialsSection.tsx
    Footer.tsx
public/
  avatar.png               <- optional; hero falls back to a monogram if absent
  arcade/index.html        <- the standalone arcade build, served at /arcade
  profile.json             <- content source for the arcade page only
```

## Editing content

Open `src/data/portfolio.json`. Nothing else needs to change.

- **New job** — add an object to `experience[]`. It renders numbered automatically.
- **New service** — add to `services[]`. The 01/02/03 numbering is derived.
- **New project** — add to `projects[]`. Set `"highlight": true` to pin it first.
  Leave `"link": ""` and the LIVE PROJECT button is hidden. Leave `"image": ""` and
  it falls back to a dark placeholder with the title.
- **Social links** — any empty string in `profile.social` is hidden, not rendered broken.
- **Testimonials** — the section hides itself entirely while `testimonials[]` is empty.
  Leave it empty rather than inventing quotes.

## Avatar

Drop a background-removed PNG at `public/avatar.png` and it appears in the hero with
layered cursor-following parallax. Without it, the hero shows a gradient monogram — no
broken image.

## Motion

Every entrance animation goes through `useEntrance` / `useEntranceOnMount`, which
return no animation props at all when `prefers-reduced-motion: reduce` is set, so
the content renders immediately and fully visible. Do not reach for Framer's
`MotionConfig reducedMotion="user"` here: it disables the transform but leaves
elements parked on their `initial` opacity of 0, which renders the page blank for
anyone with the preference on.

The hero parallax has three layers moving at different rates (glow slowest,
figure mid, sheen fastest) and is disabled entirely under reduced motion.

## Deploying

`netlify.toml` sets the build command, `dist` as publish dir and Node 20. The SPA
fallback is listed last so the rules above it win: `/arcade/*` and `/profile.json`
resolve as real files, because the arcade page fetches `../profile.json` at runtime
and a catch-all would otherwise hand it `index.html`.

## Notes

- `lucide-react` is pinned to `0.x` — v1 removed the GitHub/LinkedIn/Instagram brand icons.
- `public/profile.json` feeds the `/arcade` page only; the React site reads
  `src/data/portfolio.json`. Update both if a role changes.
