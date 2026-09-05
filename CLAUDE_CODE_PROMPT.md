# Claude Code — handoff prompt

## The path to open

```
E:\imp\Career\Resume\portfolio-react
```

Open a terminal there and run `claude`, or in Claude Code run:

```
/add-dir E:\imp\Career\Resume\portfolio-react
```

Everything below assumes that is the working directory.

---

## Prompt 1 — orient (run this first, on its own)

```
Read the whole project before changing anything. It is a React 18 + TypeScript +
Vite + Tailwind + Framer Motion portfolio, built to the structure in "Building a
Portfolio with AI — Prompt Guide" by Arvind Singh.

Key architecture rule: ALL content lives in src/data/portfolio.json and is read
through the typed hook src/hooks/usePortfolio.ts. Components must never hardcode
a name, date, project, or piece of copy. If you need new content, add a field to
the JSON and the type in src/types/portfolio.ts — do not put strings in a .tsx file.

Read these files, then give me a one-paragraph summary of the architecture and a
list of anything you think is wrong or fragile. Do not write any code yet.

- package.json
- README.md
- tailwind.config.js
- src/index.css
- src/App.tsx
- src/data/portfolio.json
- src/types/portfolio.ts
- src/hooks/usePortfolio.ts
- src/components/*.tsx
```

---

## Prompt 2 — the avatar (the site's visual signature)

```
Add the hero avatar.

I will place a background-removed PNG at public/avatar.png. src/data/portfolio.json
already points profile.avatarSvg at "/avatar.png", and HeroSection.tsx already has
an onError fallback to a gradient monogram — verify both still work.

Then improve the cursor-following parallax in HeroSection.tsx. Right now the head
layer moves but the eye and pupil layers are empty placeholder spans. Per the guide's
lesson: layered parallax with DIFFERENT easing per layer — pupils fast, eyes medium,
head slow — is what makes character tracking feel alive; whole-block movement looks
like a security camera.

Requirements:
- Keep the CSS Grid hero layout. The avatar must span grid rows 2-3 with a z-index
  above the headline so the character bursts through the title.
- Respect prefers-reduced-motion: no pointer tracking at all when it is set.
- Do not introduce a new animation library. Framer Motion is already installed.
- npm run build must pass.

Show me the diff for HeroSection.tsx before applying anything else.
```

---

## Prompt 3 — move Services into the JSON

```
src/components/ServicesSection.tsx currently holds a hardcoded SERVICES array. It
has a TODO saying so. That violates the project's content rule.

Move it into src/data/portfolio.json as a top-level "services" array, add a Service
interface to src/types/portfolio.ts, expose it through usePortfolio(), and read it
in ServicesSection.tsx. Keep the numbered 01/02/03 design exactly as it is — this is
a refactor, not a redesign. Delete the TODO comment when done.

Verify: npm run build passes, the rendered section is visually identical, and no
string from the old array remains in any .tsx file.
```

---

## Prompt 4 — real project screenshots

```
Every project in src/data/portfolio.json has "image": "". ProjectCard.tsx falls back
to a dark placeholder with the title, which works but is bland.

I will add screenshots to public/projects/<id>.png (clipforge.png, ascend.png,
habit-arena.png, content-os.png, rezclips.png).

Update the JSON image fields to those paths. Then in ProjectCard.tsx:
- keep the existing empty-string fallback working
- add loading="lazy" (already there — confirm)
- add width/height or an aspect-ratio box so the cards do not shift layout while
  images load (cumulative layout shift)

npm run build must pass.
```

---

## Prompt 5 — quality pass before shipping

```
Do a pre-deploy audit. Report findings first, fix second, and show me the list
before you change anything.

Check:
1. npm run build passes with zero TypeScript errors.
2. The hero headline never clips at 375 / 768 / 1280 / 1920px. It uses a --hero-ch
   custom property set from the name length — verify the maths still holds if
   profile.shortName changes length.
3. No mid-word wrapping anywhere (the .no-break class sets word-break: normal).
4. Empty social links, empty project links and empty images all render nothing
   broken.
5. The testimonials section stays hidden while testimonials[] is empty.
6. prefers-reduced-motion is respected by the marquee, the hero parallax, and all
   Framer Motion entrance animations.
7. Lighthouse-style basics: every img has alt text, headings are in order, colour
   contrast on neutral-500/600 text against #0C0C0C is acceptable.
8. public/arcade/index.html still loads at /arcade after a build.
```

---

## GitHub + auto-deploy (replaces manual drag-and-drop)

Right now the site is deployed by dragging a zip onto Netlify. Connecting GitHub
means `git push` deploys automatically, and you get version history and rollbacks.

### Prompt 6 — set up the repo

```
Set this project up for GitHub and Netlify continuous deployment.

1. Verify .gitignore ignores node_modules, dist, and .env files. Create or fix it.
2. git init, stage everything, and make one commit: "Portfolio rebuild — React 18 +
   TS + Vite + Tailwind, JSON-first content layer".
3. Create a netlify.toml at the repo root with:
     [build]
       command = "npm run build"
       publish = "dist"
     [build.environment]
       NODE_VERSION = "20"
   Also add an SPA fallback redirect that does NOT swallow /arcade/:
     [[redirects]]
       from = "/*"
       to = "/index.html"
       status = 200
   Confirm /arcade/index.html still resolves as a real file before the redirect.
4. Print the exact `gh repo create` command I should run, but do NOT run it or push
   anything. I will authenticate and push myself.
```

### Then, manually

```bash
# once, in E:\imp\Career\Resume\portfolio-react
gh auth login
gh repo create jasmehr-portfolio --public --source=. --remote=origin --push
```

Then in Netlify: **jasmehrsingh → Project configuration → Build & deploy → Link to
a Git repository** → pick `jasmehr-portfolio`. Netlify reads `netlify.toml`, so
build command and publish directory fill themselves in. Every push to `main`
deploys from then on.

### Reference repos worth reading

- **The guide's stack, canonical setup** — https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts
- **Tailwind + Vite official guide** — https://tailwindcss.com/docs/guides/vite
- **Framer Motion scroll/parallax examples** — https://github.com/motiondivision/motion
- **Netlify config reference** — https://docs.netlify.com/configure-builds/file-based-configuration/
- **Your own existing repos** — https://github.com/JASMEHRR

---

## Ground rules to paste at the top of any session

```
- Read files before editing them. Never assume a signature.
- Content goes in src/data/portfolio.json, never in a component.
- Show me the plan and the diff before applying multi-file changes.
- npm run build must pass before you tell me something is done.
- Do not add dependencies without asking first.
- Do not redesign anything I did not ask you to redesign.
```
