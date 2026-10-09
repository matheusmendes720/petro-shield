# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

**AxeGuard Unified Hub** (`package.json: name = "bg-boilerplate"`). A landing-page *hub* / gateway that showcases 3 external Netlify-deployed sub-apps and hard-redirects to them. It is **not** a multi-app dashboard — the 3 sub-apps live in separate repos and are reached by `window.location.href` to their own URLs.

The hub itself renders:
- A hero banner (`TopBanner.tsx`) — neon-stroked PetroShield wordmark over a metal chassis.
- Three 3D tilt cards (`ShieldCard.tsx`) — one per sub-app, with a parallax tilt + soft glow (no in-card VFX particles).
- A grid of flat hover-cards (`AppCard.tsx`) with the same 3 apps.
- A slim canvas background (`CircuitBackground.tsx`) — 30 drifting nodes with sparse L-connections + mild mouse parallax (one canvas pass per frame, no particles/hex/matrix/chromatic).

---

## Commands

| Action | Command |
|--------|---------|
| Dev server (port 3000) | `npm run dev` |
| Production build | `npm run build` (`tsc -b && vite build`) |
| Preview built site | `npm run preview` |
| Build + preview | `npm run roadshow` |

**No test suite.** Build (`tsc -b`) is the only gate; enforces `noUnusedLocals` + `noUnusedParameters`.

---

## Architecture (the only parts that matter)

### Routing (`src/App.tsx`)
- `/` → `Home.tsx` (the hub landing)
- `/go/:appId` → `RedirectGate.tsx` (3 s countdown → `window.location.href = app.url`)
- `*` → `Home.tsx` (fallback)

All routes are children of `AppLayout`, which mounts `CircuitBackground` once and wraps the outlet in an `AnimatePresence` (slide + blur cross-fade between routes).

### App registry (`src/config/apps.ts`)
Single source of truth for the 3 sub-apps. Each entry has: `id`, `subdomain`, `url`, `localPort`, `accentColor` (hex), `glowColor` (semi-transparent halo), `effectType`, `imagePath`, `icon`. `getAppUrl(app)` returns `localhost:port` when running on localhost, else the production URL. `rgba(hex, alpha)` is the helper used everywhere to derive transparent variants from `accentColor` — do **not** store alpha-suffixed hex (`#FF6200BB`) or string-patch opacity. Env overrides: `VITE_AXE_GUARD_URL`, `VITE_PETROSHIELD_FC_URL`, `VITE_SOC_SYS_URL`.

### Background (`src/components/CircuitBackground.tsx`)
Single `<canvas>` fixed full-viewport (`position: fixed`, `z-index: 0`, `pointer-events: none`). Renders 30 nodes + sparse L-shaped PCB connections in a single `requestAnimationFrame` loop. Mouse position offsets the whole scene by ±~18 px (parallax). One render pass per frame, no per-frame composite passes.

### Shield cards (`src/components/ShieldCard.tsx`)
3D tilt-reactive cards built on `framer-motion` `useMotionValue` / `useSpring`. Layers: dynamic shadow → chassis + asset + label → soft glow aura (CSS-driven on hover) → fresnel glare overlay. No VFX particles. Accent colors are sourced from `app.accentColor` and translucent variants via `rgba()`.

### Design tokens (`src/index.css`)
CSS custom properties on `:root` — `--neon-green`, `--fire-orange`, `--terminal-cyan`, `--amber`, `--red-alert`, `--void-black`, `--surface-1/2`, `--text-primary/secondary/dim`. Fonts: `--font-terminal` (VT323), `--font-mono` (JetBrains Mono), `--font-ui` (Inter). All component CSS (ShieldCard chassis, RedirectGate border trace + radio pulse, TopBanner fire-border keyframes, scanline sweep) lives in this single file — components do not inject `<style>{...}` blocks.

---

## Deployment

Static Netlify deploy. `netlify.toml` builds via `npm run build` and serves from `dist/`. `public/_redirects` (`/* → /index.html 200`) keeps React Router working. `[[headers]]` adds `x-frame-options: SAMEORIGIN` and 1-year cache for `/assets/*`. The redirect gate uses `window.location.href` (full nav) so sub-apps load in their own origin — no CORS, full sandboxing. See `DEPLOY.md` for per-app deploy instructions and the `VITE_BASE_DOMAIN` env var.

---

## Conventions Worth Knowing

- **Inline styles** dominate for layout (AppCard, Home, SystemStatusBar, TopBanner); component-specific animations + hover behaviour live in `src/index.css` keyed by component class names.
- **Single animation lib**: `framer-motion` only. No `motion/react`, no `recharts`, no `clsx`, no `tailwind-merge` — those were used by now-deleted orphan modules (`src/modules/`) and have been stripped from `package.json`.
- **No tests, no lint config, no formatter config**.
- `tsconfig.app.json` uses `target: es2023`, `verbatimModuleSyntax`, `erasableSyntaxOnly` — type-only imports must use `import type { ... }`.

## What is **not** in this project anymore

The following used to exist and have been deleted because nothing imported them and they were inflating the bundle:

- `src/modules/{beacon,enforcer,vault}/` — full standalone sibling apps, never wired into the router.
- `src/lib/api.ts` — only consumed by the deleted modules.
- `src/components/HomeButton.tsx` — only used by the deleted modules.
- `public/mocks/` — JSON consumed only by `api.ts`.
- `docs/`, `AGENTS.md`, `00_MASTER_INDEX.md`, `REQUIREMENTS_ENGINEERING.md`, `ANIMATION_ALGORITHMS.md`, `EVOLUTION.md`, `GEMINI.md`, `COMMIT_MSG.txt`, `*.log`, `launcher.html`, `launch-all.sh`, `elements/` — described a 3-repo reality that no longer exists here.

`node_modules` still has `motion`, `clsx`, `tailwind-merge`, `recharts` on disk until `npm install` resyncs the lockfile. Run that once to clean up.