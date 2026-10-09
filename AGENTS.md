# AGENTS.md

Parent workspace for the **PetroShield / AxeGuard** ecosystem — multiple independent projects bundled under one folder. **This directory is not a git repo**; each sub-project below is its own self-contained unit. Operate per-sub-project, not across the boundary.

## Workspace map

| Project | Path | Stack | Git | Purpose |
|---|---|---|---|---|
| GP SENAI 2026 dossier | `PetroShield-GranPrix_Nacional_2026/` | Python (FastAPI, pypdf) + Markdown | yes (`master`) | Hackathon competition dossier — ~95% strategy docs, ~5% Python tooling |
| AXE-Guard Multi-Agents Shell | `central/AXE-Guard_Muilti_Agents-Shell/` | Vite + React 19 + TS + Tailwind v4 + Gemini SDK | yes | Multi-agent shell UI |
| central boilerplate | `central/central/` | Vite + React 19 + TS + Framer Motion + React Router | no | Demo / roadshow app (Netlify deploy target) |
| PetroShield Finance CyberSec | `central/PetroShield_Finance-CyberSec/` | Vite + React 19 + TS + **Prisma 7 + SQLite** + D3 (geo world-map) + Recharts (chart types) + Express | yes | Finance × cyber analytics product (server-side via `tsx server.ts`; Prisma datasource URL hardcoded in `prisma.config.ts`, no `DATABASE_URL` required) |
| SOC-sys Dashboard | `central/SOC-sys_Dashboard/` | Vite + React 19 + TS + Recharts + Tailwind v4 + Motion + lucide-react | yes | SOC dashboard (see its `ARCHITECTURE.md` / `DEVELOPMENT.md`); **note:** no Redux — `@reduxjs/toolkit` appears only as a transitive dep of `recharts@3.8.1`, never imported in `src/` |

Other root entries: `central.7z` (backup archive of `central/`), `.claude/` (Claude Code user-level settings — do not commit project files there).

## Setup commands (per project)

- Install Node deps: `npm install` *or* `bun install`  *(run inside each `central/*` sub-project; they each ship a `package-lock.json`. Bun reads it but generates its own `bun.lockb` for faster subsequent installs — once you run `bun install` once, subsequent installs are ~3× faster than `npm install`)*
- Install Python deps: `pip install -r scripts/dlp_proxy/requirements.txt`  *(GP SENAI dossier only: fastapi 0.110.0, uvicorn 0.27.1, pydantic 2.6.2)*
- Start dev (Node projects): `npm run dev` *or* `bun run dev`  *(binds host `0.0.0.0`; port usually 3000)*
- Build: `npm run build` *or* `bun run build`  *(`central/central/` additionally runs `tsc -b` first)*
- Test: `npm run test` *or* `bun run test`  *(Vitest, runs from each sub-project's root. Total: 20 smoke tests across the 4 Node projects — see `src/__tests__/` in each)*
- Test (watch): `npm run test:watch` *or* `bun run test:watch`
- Test (UI): `npm run test:ui` *or* `bun run test:ui`  *(Vitest's web dashboard)*
- Lint / typecheck: `npm run lint`  *(alias for `tsc --noEmit` in the AXE, Finance, and SOC sub-projects; `central/central/` has `npm run lint` → `tsc -b`)*

> **Bun or Node?** `start-all-dev.ps1` automatically prefers Bun if it's on `PATH` (`Get-Command bun`). If not, it falls back to the `node node_modules/<bin>.js` PATH-quirk workaround. To install Bun: `irm bun.sh/install.ps1 | iex` in PowerShell.

## Unified hub dev workflow

`central/central/` is the unified **PetroShield Hub** SPA. It already ships with an app registry (`src/config/apps.ts`) and a "Relic Shields" landing page; clicking a shield embeds the corresponding sub-app in an `<iframe>` so you stay inside the hub chrome.

**Port allocation** (kept in sync with `central/central/src/config/apps.ts`):

| Service | Port | Where |
|---|---|---|
| Hub (PetroShield unified SPA) | 3000 | `central/central/` |
| AXE-Guard Shell | 3001 | `central/AXE-Guard_Muilti_Agents-Shell/` |
| PetroShield Finance-CyberSec | 3002 | `central/PetroShield_Finance-CyberSec/` |
| SOC-sys Dashboard | 3003 | `central/SOC-sys_Dashboard/` |

**One-shot launch** — at the workspace root:
```powershell
.\start-all-dev.ps1            # opens 4 console windows (hub + 3 sub-apps), then opens the hub in your browser
.\start-all-dev.ps1 -OnlyHub   # just the hub
.\stop-all-dev.ps1             # tears down everything on ports 3000-3003
```

**Manual launch** — open four terminals and run `npm run dev` in each sub-project listed above; visit `http://localhost:3000` to see the hub.

**Embedding behavior**: in local dev, the hub renders `<AppFrame>` at `/app/:appId`, an `<iframe>` pointing at `http://localhost:<localPort>`. Same-origin policy isolates cookies/storage per port. The embed top-bar exposes **HUB** (back to landing), **RELOAD** (refresh the iframe), and **STANDALONE** (open the sub-app in its own tab). In production, `getAppUrl()` switches to the Netlify subdomain and the legacy 3-second `RedirectGate` (route `/go/:appId`) takes over.

**Adding a new sub-app to the hub**:
1. Pick a free port and update that sub-project's `vite.config.ts` / `package.json dev` script + `central/central/src/config/apps.ts` (`APPS[]`) with matching `localPort`.
2. Add a static shield image to `central/central/public/elements/<your-app>.png` (referenced by `imagePath`).
3. Done — the hub reads `APPS[]` and renders a new card automatically.

## Cloud deploy (Bun · Vitest · GitHub Actions · Netlify)

Each of the 4 Node sub-projects is pre-wired for the full cloud-deploy pipeline. The hub and the parent workspace are not git repos, so they have no GHA — they're deployed by the dev orchestration (`start-all-dev.ps1`).

### What lives in each sub-project

| File | Purpose |
|---|---|
| `package.json` → `engines` | Pins `node >=20 \|\| bun >=1.1`; CI uses Bun |
| `package.json` → scripts | `test`, `test:watch`, `test:ui` (Vitest); existing `dev`/`build`/`lint` |
| `src/__tests__/*.test.ts` | Smoke tests — pure unit, no DB / network — 1 file per project |
| `vitest` + `@vitest/ui` (devDep) | Test runner + UI dashboard |
| `.github/workflows/ci.yml` | On PR + push to main: `bun install` → lint → test → build → upload `dist/` artifact |
| `.github/workflows/release.yml` | On tag push `v*` + manual dispatch: `bun install` → build → create GitHub Release with `dist/` attached |
| `netlify.toml` | Build command `bun run build`, publish `dist/`, Node 20, security headers, SPA fallback |

### What you do once (per sub-project)

1. **Connect the repo to Netlify.** Netlify dashboard → "Add new site" → "Import an existing project" → pick the repo. The first build picks up `netlify.toml` automatically. After that, every push to `main` deploys, every PR gets a preview URL.
2. **Set the GitHub repo's default branch to `main`.** GHA workflows key off `main`. The current default in all three sub-repos is already `main`.
3. **Set the GitHub repo's "Actions" permission to "Allow all actions"** (or scope-allow `oven-sh/setup-bun` + `softprops/action-gh-release` + `actions/upload-artifact` + `actions/checkout`). Default on new repos is fine.

### What you do for a release

```bash
git tag v0.1.0
git push origin v0.1.0
```

`release.yml` picks up the tag, builds, creates a GitHub Release with auto-generated notes, and attaches `dist/`. Netlify's GitHub App separately deploys `main` — they don't step on each other.

### Caveats (read these before deploying)

- **Finance's API is dev-only in this setup.** The Express server (Prisma 7 + better-sqlite3) does not deploy to Netlify Functions out of the box. Either convert to Netlify Functions or deploy `server.ts` to Render/Fly/Railway. The static `dist/` (the React UI) deploys fine. `central/PetroShield_Finance-CyberSec/netlify.toml` documents this in a comment.
- **AXE-Guard and SOC-sys `/api/health` only work in dev.** The Vite middleware that serves it is dev-only. The static Netlify build returns 404 for `/api/health` — the hub's `<HealthDot>` flips to red, which is the correct signal.
- **Hub's own `netlify.toml`** sets `VITE_HUB_MODE=prod` in the build environment so the embedded `<iframe>` path is bypassed in favor of the `RedirectGate`. Each sub-app then loads on its own Netlify subdomain, no same-origin issues.
- **Bun is not installed on this machine.** The orchestration script detects this and falls back to `node node_modules/...`. CI uses `oven-sh/setup-bun@v2` so GHA always has Bun. To get Bun locally: `irm bun.sh/install.ps1 | iex`.

## Project layout

- `PetroShield-GranPrix_Nacional_2026/` — single-team competition dossier for SENAI Grand Prix Nacional 2026 (Apr 13–17 2026). Folder numbering (`00_Regulamento/` … `06_Entregas/`) is by **phase**, not by component. `scripts/` holds the only runnable code (FastAPI DLP demo + OSINT/econometric pipeline). Already has a detailed **`CLAUDE.md`** — read it before non-trivial edits in this sub-project.
- `central/` — sibling Node projects, each with its own `.claude/`, `.env.example`, `tsconfig*.json`, `vite.config.ts`, and (where applicable) `.git`. They are **not a monorepo** — there is no root `package.json` and no shared workspace config. Treat them as four independent Vite apps.

## Code style (Node sub-projects)

- TypeScript with the default Vite template `tsconfig.json` — **note:** `"strict": true` is **not** enabled in any of the four Node sub-repos (the AI Studio template ships without it; AXE-Guard, Finance-CyberSec, and SOC-sys all run `tsc --noEmit` without strict null-safety or strict-implicit-any). Flip it on per sub-repo if you want full strictness.
- Tailwind v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js`).
- React 19 + functional components + hooks.
- Lint is just `tsc --noEmit` — **no ESLint / Prettier configured** in any of the four. If you add either, configure per-project, not at the parent.
- `central/central/` invokes Vite/TSC via `node node_modules/<bin>.js` workarounds (PATH quirk on this machine); if it fails on yours, fall back to `npx vite …`. (Bun-installed users can just `bun run dev` — Bun puts `node_modules/.bin` on PATH automatically.)

## Code style (GP SENAI dossier)

- Portuguese (pt-BR) for strategy/deliverable docs; English for code and commit messages.
- Sensitive OSINT in `01_Intel_OSINT/` is **partially** `.gitignore`d — the `.gitignore` matches six specific filenames (e.g. `*/OSINT_Recruitment_Playbook.md`); the directory itself is currently **commented out**, so other intel files in the folder are NOT auto-ignored. Do not commit files matching those patterns even if asked; surface to the user before committing anything else from `01_Intel_OSINT/`.
- No `Co-Authored-By` trailer on commits.
- Color tokens for any UI snippets: `#0D1117` (bg), `#00FF41` (matrix-green accent), `#0052FF` (trust-blue accent).
- See `PetroShield-GranPrix_Nacional_2026/CLAUDE.md` for the canonical "big picture" architecture, deliverable status, and the full conventions list.

## Per-project entry points

- GP SENAI dossier: `PetroShield-GranPrix_Nacional_2026/README.md` + `INDEX_GP_NACIONAL_2026.md`
- **Central hub** (PetroShield unified SPA): `central/central/HUB_ARCHITECTURE.md` — port map, iframe-vs-redirect-gate decision tree, `/api/health` policy, how to add a 4th sub-app
- AXE-Guard Shell: `central/AXE-Guard_Muilti_Agents-Shell/README.md`  *(requires `GEMINI_API_KEY` in `.env.local`)*
- central boilerplate: `central/central/README.md` + `DEPLOY.md`
- PetroShield Finance-CyberSec: `central/PetroShield_Finance-CyberSec/README.md`  *(Prisma schema in `prisma/`, local SQLite at `dev.db`)*
- SOC-sys Dashboard: `central/SOC-sys_Dashboard/README.md` + `ARCHITECTURE.md` + `DEVELOPMENT.md`

## Security

- `.env`, `.env.local`, `.env.example` patterns are project-local — never commit a real `.env` (only `.env.example`).
- GP SENAI dossier: social-engineering / OSINT recruitment material has partial `.gitignore` coverage (specific patterns only — see the "Code style (GP SENAI dossier)" bullet above). Surface to the user before overriding.
- The competition's IP-trap strategy (Art. 9.3 of the edital) means the **frontend is the public asset and the backend is the moat** — never publish full backend code under the team name without confirming with the user.

## Branching & commits

- This parent directory has no git of its own. Branch/commit inside the sub-repo you are changing.
- Default branch in the GP SENAI sub-repo is `master`.
- Conventional commits where it makes sense (`feat:` / `fix:` / `docs:` / `refactor:`); the GP SENAI repo already uses this style.

## Sub-repo AGENTS.md

All four git-tracked sub-repos now ship an `AGENTS.md` (consumed by OpenCode / Codex / Cursor / Aider / Devin / Gemini CLI). `PetroShield-GranPrix_Nacional_2026/` additionally has a detailed `CLAUDE.md` — Claude Code-specific guidance that complements `AGENTS.md` for that sub-repo and is the canonical "big picture" reference. The four sub-repo `AGENTS.md` files are currently **untracked** in their respective git repos (seeded but not yet committed). The parent workspace itself is not a git repo — sub-repo `AGENTS.md` changes are committed inside each sub-repo.