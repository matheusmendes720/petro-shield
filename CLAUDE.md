# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Repo Is

**PetroShield unified monorepo.** A single Netlify site that bundles the PetroShield / AxeGuard hub with three sub-apps (AXE-Guard Multi-Agents Shell, PetroShield Finance-CyberSec, SOC-sys Dashboard) plus one sibling project (the GP SENAI 2026 competition dossier, kept outside the unified build). The parent repo was **just collapsed** from a "hub redirects to N independent Netlify sites" topology into one orchestrator: a single `netlify.toml`, a single `dist/`, and one Netlify URL with sub-folders per app.

**Do not confuse with the old layout.** `central/central/CLAUDE.md` still describes the old "3 separate Netlify subdomains, redirect-only" hub. That file is **stale**. The authoritative architecture lives in `central/central/HUB_ARCHITECTURE.md`, and the per-sub-project deploy notes from the old `AGENTS.md` "Cloud deploy" section are superseded by the single-site setup.

## The 30-second mental model

```
┌───────────────────────────────────────────────────────────────┐
│  ONE Netlify site (this repo's ./dist/)                       │
│                                                               │
│  /                        →  Hub SPA (PetroShield shields)    │
│  /axe-guard/*             →  AXE-Guard sub-app (SPA fallback) │
│  /petroshield-finance/*   →  Finance sub-app    (SPA fallback)│
│  /soc-sys/*               →  SOC-sys sub-app    (SPA fallback)│
└───────────────────────────────────────────────────────────────┘
```

Local dev mirrors this: 4 separate `localhost` ports (3000/3001/3002/3003), and the hub **embeds** sub-apps in `<iframe>`s. Production switches to **redirect-gate** mode (different origins, can't iframe across sub-folders without `X-Frame-Options` issues). The dual-mode switch is driven by `VITE_HUB_MODE` / hostname sniff in `central/central/src/config/apps.ts`. See `central/central/HUB_ARCHITECTURE.md` for the full decision tree.

## Canonical commands

All run from the repo root unless noted. Runtime: Bun if on PATH (faster), else Node + the `node node_modules/<bin>.js` workaround.

| Task | Command |
|---|---|
| Install deps in every sub-project | loop `bun install` over each `central/*/` (or `npm install`) |
| Build everything → `./dist/` | `bun run build` (or `npm run build`) — calls `scripts/build.mjs` |
| Lint everything | `bun run lint` — runs `tsc -b` in `central/central/` + `tsc --noEmit` in the others |
| Test everything (Vitest) | `bun run test` |
| Clean build artifacts | `bun run clean` |
| **Launch all 4 dev servers** | `.\start-all-dev.ps1` (logs in `.logs\`) |
| **Tear them down** | `.\stop-all-dev.ps1` |

Inside a single sub-project, the usual Vite flow works (`npm run dev` / `build` / `test` / `lint`). Per-project entry points and stack notes live in the table below — read the linked doc before non-trivial changes.

## Where to read what

| Topic | File |
|---|---|
| Hub architecture, dual-mode logic, port map, `/api/health` policy, adding a 4th sub-app | `central/central/HUB_ARCHITECTURE.md` |
| Workspace map, per-project stacks, conventions, security, branching | `AGENTS.md` (root) |
| Hub SPA — React Router routes, app registry, design tokens | `central/central/src/` (see `App.tsx`, `config/apps.ts`, `index.css`) |
| AXE-Guard Shell (Gemini SDK) | `central/AXE-Guard_Muilti_Agents-Shell/README.md` |
| Finance-CyberSec (Prisma 7 + Express + D3/Recharts) | `central/PetroShield_Finance-CyberSec/README.md` |
| SOC-sys Dashboard | `central/SOC-sys_Dashboard/README.md` + `ARCHITECTURE.md` + `DEVELOPMENT.md` |
| GP SENAI 2026 competition dossier (separate, not part of unified build) | `PetroShield-GranPrix_Nacional_2026/CLAUDE.md` + `INDEX_GP_NACIONAL_2026.md` |

## Architecture decisions that will save you from re-deriving them

1. **Single Netlify site, sub-path routing.** `netlify.toml` declares 4 SPA-fallback redirects (one per sub-app) plus a root fallback to the hub. Each sub-app keeps its own Vite build; `scripts/build.mjs` runs `npm run build` in each sub-project sequentially and hoists the resulting `dist/` into the root `dist/<prefix>/`. Sequential (not parallel) because log output stays readable and total wall-clock is dominated by Finance's Prisma generate.

2. **Hub has two URL paths per shield: `/app/:appId` (local iframe) and `/go/:appId` (prod redirect).** A single `HUB_MODE` constant in `central/central/src/config/apps.ts` decides which one is live. The iframe path exists because in dev all 4 ports share `localhost`, so same-origin policy isolates storage cleanly. In prod the sub-apps live on different origins (different sub-paths, different `localStorage`), so the iframe is replaced by a 3-second `<RedirectGate>` countdown.

3. **Each sub-app owns its port** (`vite.config.ts` → `server.port`, or `process.env.PORT` in Finance's `server.ts`). The orchestrator script honors whatever the sub-project declares; this lets a sub-project run standalone without colliding with the hub.

4. **Hub is not a separate git repo.** `central/central/` ships **without** `.git/`. The three sub-app folders are submodules (`.gitmodules`) into `./_external/`. The parent repo is the canonical history; submodule pointer updates are how the three sub-apps track their own work. (`central/central/` is the only sub-project without its own `.git/` — see `HUB_ARCHITECTURE.md` § "State, isolation, and known limitations" if you need to ship the hub independently.)

5. **No workspace-level tooling.** There's no `package-lock.json` at the root, no monorepo orchestrator (Nx / Turborepo / pnpm workspaces). Each `central/*/` is a self-contained Vite app with its own lockfile. If you add cross-cutting tooling, scope it per sub-project — the parent only owns orchestration scripts.

6. **Lint = `tsc --noEmit` (or `tsc -b` for the hub).** No ESLint, no Prettier anywhere. The hub's `tsc -b` enforces `noUnusedLocals` + `noUnusedParameters` and is the strictest gate; the other sub-projects use the default Vite `tsconfig` (which means `"strict": true` is **off** — see `AGENTS.md` "Code style" before flipping it).

7. **Finance's `server.ts` does not deploy to Netlify.** The Prisma + better-sqlite3 + Express stack runs in dev. Netlify only publishes the static `dist/` (the React UI). To make the API work in prod, convert to Netlify Functions or deploy `server.ts` elsewhere. This is documented in the **old** sub-project `netlify.toml` comments, now superseded by the parent's single `netlify.toml`.

8. **Sensitive OSINT in the GP SENAI dossier.** `PetroShield-GranPrix_Nacional_2026/01_Intel_OSINT/` has partial `.gitignore` coverage by specific filename pattern. Surface to the user before committing anything else from that folder. Color tokens for UI snippets in that dossier: `#0D1117` (bg), `#00FF41` (matrix-green), `#0052FF` (trust-blue).

## What NOT to do without asking

- Don't touch `netlify.toml` redirect rules without checking all 4 sub-app routers — the SPA-fallback pattern depends on each sub-app mounting its router at `/`.
- Don't `rm -rf node_modules` at the repo root — there is none. Each sub-project has its own; install in each.
- Don't run `bun install` from the repo root — there's no root `package.json` that consumes one. Run it inside each `central/*/`.
- Don't move the Prisma schema or rename `server.ts` in `PetroShield_Finance-CyberSec/` — Finance's dev server (`tsx server.ts`) reads from a hardcoded `prisma.config.ts` datasource URL, not `DATABASE_URL`.
- Don't add a root-level `.env` — each sub-project has its own `.env.example`. Keep them per-project.