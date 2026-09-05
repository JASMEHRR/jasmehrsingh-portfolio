# Master prompt for Claude Code

Open a terminal in `E:\imp\Career\Resume\portfolio-react`, run `claude`, attach your
2–3 screenshots, and paste everything between the lines below.

---

You are working on my personal portfolio site. Attached are 2–3 screenshots of the
current build running in the browser — treat them as the source of truth for what it
actually looks like right now, not the code alone.

## Project root

```
E:\imp\Career\Resume\portfolio-react
```

## Full file tree (excluding node_modules)

```
E:\imp\Career\Resume\portfolio-react\
├─ index.html                          Vite entry, <div id="root">, meta tags
├─ package.json                        React 18.3.1, TS, Vite 8, Tailwind 3.4,
│                                      framer-motion, lucide-react pinned to 0.x
├─ package-lock.json
├─ vite.config.ts
├─ tsconfig.json / tsconfig.app.json / tsconfig.node.json
├─ tailwind.config.js                  design tokens: bg #0C0C0C, card #141414,
│                                      line #242424, Kanit, chrome + accent gradients
├─ postcss.config.js
├─ .oxlintrc.json
├─ .gitignore
├─ README.md                           install / scripts / structure / how to edit content
├─ CLAUDE_CODE_PROMPT.md               staged prompts (this file supersedes it)
├─ public\
│  ├─ arcade\index.html                standalone Minecraft-style site, served at /arcade
│  ├─ profile.json                     content source for /arcade ONLY
│  ├─ favicon.svg
│  └─ icons.svg
└─ src\
   ├─ main.tsx                         createRoot, throws if #root missing
   ├─ App.tsx                          section order: Navbar, Hero, About, Experience,
   │                                   Services, Projects, Testimonials, Footer
   ├─ index.css                        Kanit @import, Tailwind layers, .hero-heading
   │                                   chrome gradient, .hero-heading-size clamp with
   │                                   --hero-ch, .no-break, marquee keyframes,
   │                                   prefers-reduced-motion block
   ├─ data\portfolio.json              ALL CONTENT LIVES HERE
   ├─ types\portfolio.ts               Portfolio, Profile, Social, SkillCategory,
   │                                   Experience, Project, Education, Testimonial
   ├─ hooks\usePortfolio.ts            typed accessor — the only way in
   ├─ assets\hero.png, vite.svg        unused leftovers from the Vite template
   └─ components\
      ├─ Navbar.tsx                    HOME/ABOUT/SKILLS/PROJECTS/CONTACT, mobile menu
      ├─ SocialLinks.tsx               'pill' and 'plain' variants, hides empty hrefs
      ├─ HeroSection.tsx               CSS Grid, chrome headline, cursor parallax
      ├─ AboutSection.tsx              bio from JSON, .no-break
      ├─ ExperienceSection.tsx         numbered 01/02/03, monospace period pill
      ├─ ServicesSection.tsx           HARDCODED array + TODO — needs moving to JSON
      ├─ ProjectsSection.tsx           sorts highlight:true first
      ├─ ProjectCard.tsx               sticky card, hides LIVE PROJECT on empty link
      ├─ TestimonialsSection.tsx       marquee; hides itself when array empty
      └─ Footer.tsx                    3-col, copy-email button, bottom strip
```

## Architecture rule — do not break this

Every piece of content lives in `src\data\portfolio.json` and is read through
`src\hooks\usePortfolio.ts`. **No component may hardcode a name, date, project,
metric or sentence.** If you need new content, add the field to the JSON *and* the
matching interface in `src\types\portfolio.ts`. This is the single most important
architectural decision in the project — a design pivot should only ever touch JSON.

## What this was built from

The structure follows *Building a Portfolio with AI — Prompt Guide* by Arvind Singh:
React 18 + TypeScript + Vite + Tailwind + Framer Motion + lucide-react, JSON-first
content layer, eight sections, 3D-styled avatar in the hero. Design tokens:
background `#0C0C0C`, headline gradient `linear-gradient(180deg,#646973,#BBCCD7)`,
accent gradient purple → magenta → orange, Kanit typeface.

## Your task

Work in stages. **Do not write code until I approve stage 1.**

### Stage 1 — read and report (no code)

Read the screenshots and these files:

```
src\App.tsx
src\index.css
src\data\portfolio.json
src\types\portfolio.ts
src\hooks\usePortfolio.ts
src\components\HeroSection.tsx
src\components\ServicesSection.tsx
src\components\ProjectCard.tsx
tailwind.config.js
package.json
```

Then give me:
1. One paragraph on how the app is wired.
2. A numbered list of every visual problem you can see **in the screenshots** —
   spacing, alignment, contrast, typography, anything that looks unfinished or off.
   Be specific and reference what you see, not what you assume.
3. Anything fragile in the code (accessibility, layout shift, type safety, dead files).
4. Your proposed fix order, cheapest-highest-impact first.

Stop there and wait for me.

### Stage 2 — fixes (after I approve)

Apply only what I approve, one concern per commit-sized change, showing me the diff
for any multi-file edit before applying it.

Known work already identified:

- **Avatar.** `src\data\portfolio.json` → `profile.avatarSvg` points at `/avatar.png`.
  I will drop a background-removed PNG at `public\avatar.png`. `HeroSection.tsx`
  already has an `onError` fallback to a gradient monogram — verify it still works,
  then finish the parallax: the eye and pupil layers are currently **empty
  placeholder `<motion.span>` elements that do nothing**. Give each layer different
  easing — pupils fast, eyes medium, head slow. Whole-block movement looks like a
  security camera; layered movement is what makes it feel alive. Keep the avatar
  spanning grid rows 2–3 above the headline so it bursts through the title.

- **Services.** `src\components\ServicesSection.tsx` holds a hardcoded `SERVICES`
  array with a `TODO`. Move it to a top-level `services` array in
  `src\data\portfolio.json`, add a `Service` interface to `src\types\portfolio.ts`,
  expose it via `usePortfolio()`, and delete the TODO. Keep the numbered 01/02/03
  design pixel-identical — this is a refactor, not a redesign.

- **Dead files.** `src\assets\hero.png` and `src\assets\vite.svg` are unused Vite
  template leftovers. Confirm nothing imports them, then delete.

- **Project images.** Every project in the JSON has `"image": ""`, so cards fall
  back to a dark placeholder. If I supply screenshots at `public\projects\<id>.png`,
  wire them up and add an aspect-ratio box so images don't cause layout shift.

### Stage 3 — verify before you claim anything is done

- `npm run build` passes with zero TypeScript errors.
- The hero headline does not clip at **375 / 768 / 1280 / 1920px**. It sizes itself
  via a `--hero-ch` custom property derived from `profile.shortName.length` — check
  the maths still holds if the name gets longer or shorter.
- No mid-word wrapping anywhere (`.no-break` sets `word-break: normal`).
- Empty social links, empty project links and empty images render nothing broken.
- Testimonials section stays hidden while `testimonials[]` is empty — **never invent
  testimonials.**
- `prefers-reduced-motion` is respected by the marquee, the hero parallax and every
  Framer Motion entrance animation.
- `public\arcade\index.html` still loads at `/arcade` after a build.
- Every `<img>` has alt text; heading order is sane.

## Ground rules

- Read a file before editing it. Never assume a signature or an export.
- Content goes in JSON, never in a `.tsx`.
- Show the plan and the diff before multi-file changes.
- `npm run build` must pass before you say something is finished.
- Do not add a dependency without asking. Do not upgrade React past 18.
- `lucide-react` is pinned to `0.x` on purpose — v1 removed the GitHub, LinkedIn and
  Instagram brand icons. Do not bump it.
- Do not redesign anything I didn't ask you to redesign.
- If you think my instruction is wrong, say so before doing it.

## References

- Vite react-ts template — https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts
- Tailwind + Vite setup — https://tailwindcss.com/docs/guides/vite
- Framer Motion — https://github.com/motiondivision/motion
- lucide-react icons — https://lucide.dev/icons/
- Netlify file-based config — https://docs.netlify.com/configure-builds/file-based-configuration/
- My GitHub — https://github.com/JASMEHRR

## Deployment context

The site is currently deployed by dragging a zip onto Netlify (project
`jasmehrsingh`, live at https://jasmehrsingh.netlify.app). I want to move to Git-based
deploys. When the visual work is done, create a `netlify.toml` at the repo root with
build command `npm run build`, publish directory `dist`, `NODE_VERSION = "20"`, and an
SPA fallback redirect that does **not** swallow `/arcade/`. Then print the exact
`gh repo create` command for me to run — do not run it or push anything yourself.
