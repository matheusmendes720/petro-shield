# Hub Architecture — PetroShield Unified Monorepo

`central/central/` is the **hub** SPA that lives at the root of a single Netlify project. Three sibling sub-apps are built and deployed alongside it as sub-paths of the same `dist/`. This document describes how the binding works so a future agent can extend it without re-deriving the design.

## TL;DR

| Page | URL (single Netlify site) | Local dev URL |
|---|---|---|
| Hub (PetroShield unified SPA) | `https://petroshield-hub.netlify.app/` | `http://localhost:3000/` |
| AXE-Guard Shell | `https://petroshield-hub.netlify.app/axe-guard/` | `http://localhost:3001/` |
| PetroShield Finance-CyberSec | `https://petroshield-hub.netlify.app/petroshield-finance/` | `http://localhost:3002/` |
| SOC-sys Dashboard | `https://petroshield-hub.netlify.app/soc-sys/` | `http://localhost:3003/` |

**One Netlify project. One build. Four pages at four sub-paths.** No iframes, no per-app deploys, no subdomains.

## Top-level layout (this repo is a git monorepo with submodules)

```
petro-shield/                                    ← git repo (this directory)
├── .gitmodules                                  ← 3 submodule entries
├── netlify.toml                                 ← single Netlify config (build + SPA fallbacks)
├── package.json                                 ← root scripts (build, dev, clean, lint, test)
├── scripts/
│   ├── build.mjs                                ← orchestrates the 4 builds → dist/
│   ├── clean.mjs · test.mjs · lint.mjs
├── AGENTS.md · .gitignore · start-all-dev.ps1 · stop-all-dev.ps1
├── central/
│   ├── central/                                 ← hub (in-tree, not a submodule)
│   ├── AXE-Guard_Muilti_Agents-Shell/           ← git submodule → ./external/AXE-...
│   ├── SOC-sys_Dashboard/                       ← git submodule → ./external/SOC-...
│   └── PetroShield_Finance-CyberSec/            ← git submodule → ./external/Petr...
└── dist/                                        ← generated; the publish dir for Netlify
```

The `central/*/AXE-Guard_Muilti_Agents-Shell/`, `central/*/SOC-sys_Dashboard/`, and `central/*/PetroShield_Finance-CyberSec/` directories are git submodules of this repo — they each keep their own `.git` history. See `.gitmodules` for the source URLs (currently local-path URLs; swap to GitHub URLs after pushing the sub-repos).

## Port allocation

Each sub-project owns its port — declared in that sub-project's `vite.config.ts` (or `server.ts` for Finance). The orchestration script just honors the contract; it does not impose the port.

| Port | Service | Where the port is set |
|---|---|---|
| **3000** | Hub (this app) | `central/central/vite.config.ts` → `server.port: 3000, strictPort: true, host: '0.0.0.0'` |
| **3001** | AXE-Guard Shell | `central/AXE-Guard_Muilti_Agents-Shell/vite.config.ts` → `server.port: 3001, …` |
| **3002** | PetroShield Finance-CyberSec | `central/PetroShield_Finance-CyberSec/server.ts` → `process.env.PORT ?? 3002` (Express + Vite middleware) |
| **3003** | SOC-sys Dashboard | `central/SOC-sys_Dashboard/vite.config.ts` → `server.port: 3003, …` |

The orchestration script `start-all-dev.ps1` (or `bun run dev` per sub-project) reads these ports and launches each as a detached process. Sub-projects can also be run standalone without the hub — each has its own `dev` script that binds its assigned port.

## Sub-page routing (real navigation, no iframes)

When the user clicks a shield card on the hub, the browser does a real navigation to the sub-path. There is **no `<iframe>` embed** and no redirect gate. `getAppUrl()` in `src/config/apps.ts` resolves the URL based on the active mode:

```ts
// central/central/src/config/apps.ts
export function getAppUrl(app: AppConfig): string {
  if (HUB_MODE === 'local') return `http://localhost:${app.localPort}/`   // dev: hit the sub-app's own dev server
  return app.path                                                              // prod: sub-path under the single Netlify site
}
```

`HUB_MODE` resolves from `VITE_HUB_MODE` (env var) → falls back to a hostname sniff (localhost/127.0.0.1 ⇒ `local`, else `prod`) → defaults to `prod` as a safe fallback.

Each sub-app's `vite.config.ts` declares its `base: '/<sub-path>/'`. This is what makes the sub-app's built `dist/index.html` and asset URLs resolve correctly when served from a sub-path. Without `base`, the sub-app's `dist/assets/index-abc123.js` would be requested at the site root and 404.

```ts
// central/AXE-Guard_Muilti_Agents-Shell/vite.config.ts
export default defineConfig(({mode}) => {
  // ...
  return {
    base: '/axe-guard/',
    plugins: [react(), tailwindcss(), healthPlugin],
    server: { port: 3001, strictPort: true, host: '0.0.0.0' },
  };
});
```

The same pattern in SOC-sys (`base: '/soc-sys/'`) and Finance (`base: '/petroshield-finance/'`).

## Local-mode flow (dev)

```
http://localhost:3000/                      ← Hub SPA (port 3000)
   │
   ├─ click "AXE-Guard" shield    →  getAppUrl('axe-guard')         →  http://localhost:3001/
   ├─ click "Finance" shield     →  getAppUrl('petroshield-fc')     →  http://localhost:3002/
   └─ click "SOC-sys" shield     →  getAppUrl('soc-sys')            →  http://localhost:3003/
```

Each sub-app runs on its own dev port (3001/3002/3003). The hub does **not** proxy requests; it links directly to the sub-app's URL.

To launch everything at once:

```powershell
.\start-all-dev.ps1          # hub + 3 sub-apps in detached cmd windows
```

Or per sub-project:
```bash
cd central/<sub-project> && npm run dev
```

## Prod-mode flow (single Netlify site)

```
https://petroshield-hub.netlify.app/                 ← Hub (the unified site)
   │
   ├─ click "AXE-Guard" shield    →  getAppUrl('axe-guard')         →  /axe-guard/
   ├─ click "Finance" shield     →  getAppUrl('petroshield-fc')     →  /petroshield-finance/
   └─ click "SOC-sys" shield     →  getAppUrl('soc-sys')            →  /soc-sys/
```

`netlify.toml` at the repo root handles the SPA fallbacks:

```toml
[[redirects]]
  from = "/axe-guard/*"
  to   = "/axe-guard/index.html"
  status = 200
# (and the same for /petroshield-finance/* and /soc-sys/*)
```

So a hard refresh on `/axe-guard/some-deep-route` still serves `/axe-guard/index.html` and the sub-app's client-side router takes over.

## Build orchestration

`scripts/build.mjs` is the single entry point that produces `./dist/` for Netlify. Steps, in order:

1. **Clean** `dist/` at the repo root.
2. **Hub** — `tsc -b` (project references, ~2 s) then `vite build` (~0.3 s). Hoist `central/central/dist/*` → `dist/`.
3. **AXE-Guard** — `vite build` (~4 s). Hoist → `dist/axe-guard/`.
4. **Finance** — `vite build` (~20 s; emits a > 500 KB chunk warning because the D3 + Recharts + Prisma client is hefty). Hoist → `dist/petroshield-finance/`.
5. **SOC-sys** — `vite build` (~10 s). Hoist → `dist/soc-sys/`.
6. **Tree dump** — prints the final `dist/` structure for verification.

Total wall-clock: ~35 s. Output: 22 files, ~21 MB.

The script invokes `node node_modules/vite/bin/vite.js build` directly inside each sub-project. We tried `npm run build` via `spawnSync` first, but the npm-script shim was unreliable on Windows (the Finance build silently produced nothing). Direct `node` invocations are deterministic.

## Final `dist/` structure

```
dist/
├── index.html                 ← Hub
├── assets/                    ← Hub assets (CSS, JS, vendor chunks)
├── elements/                  ← Hub shield images (3d_letter_title, axe_guard, …)
├── _redirects                 ← Hub's own _redirects (SPA fallback inside /)
├── axe-guard/
│   ├── index.html
│   └── assets/
├── petroshield-finance/
│   ├── index.html
│   └── assets/
└── soc-sys/
    ├── index.html
    └── assets/
```

`netlify.toml` ships with this whole tree as `publish = "dist"`. All four `index.html` files are at the right paths.

## Health endpoint (`/api/health`)

Each sub-app serves `GET /api/health` so the hub can paint a live status dot on each shield card. Implementation per sub-app:

| Sub-app | Implementation | Response |
|---|---|---|
| Hub (3000) | not served — the hub is a static SPA without an API surface | n/a |
| AXE-Guard (3001) | Vite middleware plugin (`vite.config.ts`) | `{ status: 'ok', app: 'axe-guard' }` |
| Finance (3002) | Express route (`server.ts`) | `{ status: 'ok', db: 'ok', counts: {…}, uptime: … }` (or 503 if Prisma is down) |
| SOC-sys (3003) | Vite middleware plugin (`vite.config.ts`) | `{ status: 'ok', app: 'soc-sys' }` |

All three respond with `Access-Control-Allow-Origin: *` (cross-origin fetch from the hub at `:3000`). `getAppHealthUrl()` in `src/config/apps.ts` builds the right URL per mode:

```ts
export function getAppHealthUrl(app: AppConfig): string {
  if (HUB_MODE === 'local') return `http://localhost:${app.localPort}/api/health`
  return `${app.path.replace(/\/$/, '')}/api/health`
}
```

The `<HealthDot>` component (in `src/components/HealthDot.tsx`) pings with a 1500 ms `AbortController` timeout. Result mapping:

- 2xx → green dot
- non-2xx / network error / timeout → red dot
- in flight → grey dot

**Caveat:** the Vite middleware plugins only exist in dev. In prod, `/api/health` returns 404 → `<HealthDot>` flips red. This is the correct signal — if the user wants a prod health check, each sub-app needs a Netlify Function (one per app at `/.netlify/functions/health`).

## State, isolation, and known limitations

- **State isolation.** Each sub-app is a separate origin (different localhost port in dev, same Netlify site at a different sub-path in prod). `localStorage`, `sessionStorage`, cookies, and `IndexedDB` are per-origin. The hub cannot read the sub-app's state and vice-versa.
- **No cross-app messaging today.** If a future agent wants shared theme/auth/alerts across the hub and a sub-app, the right tool is `postMessage` with a typed message contract. Not implemented.
- **Finance's Express API is dev-only in this build.** The static `dist/petroshield-finance/` deploys, but the API routes (`/api/stats`, `/api/threats`, `/api/health`) are served by `server.ts` which is not part of the Netlify deploy. Two options to ship the API: (a) convert to Netlify Functions, (b) deploy `server.ts` to Render/Fly/Railway and point a `VITE_API_BASE_URL` at it. Documented in `central/PetroShield_Finance-CyberSec/server.ts`.
- **Netlify CLI version** — when you `npm install -g netlify-cli` locally, Netlify 27.x is current. The CLI's default `netlify deploy` re-runs the `build.command` from `netlify.toml`; use `--no-build` to push the local `dist/` without rebuilding.

## How to add a fourth sub-app

1. **Create the sub-project** at `central/<your-app>/` with its own `package.json`, `vite.config.ts`, and (after `npm install`) `node_modules/`.
2. **Pick a free port** (currently 3004 is unused). Set `server: { port: 3004, strictPort: true, host: '0.0.0.0' }` in the sub-app's `vite.config.ts` (or `process.env.PORT ?? 3004` for an Express app).
3. **Set the base path** in the same `vite.config.ts`: `base: '/<your-app-path>/'`. The build will then produce asset URLs that resolve under that sub-path on Netlify.
4. **Add a health endpoint** — for a Vite SPA, add the `healthPlugin` pattern (see `AXE-Guard_Muilti_Agents-Shell/vite.config.ts`). For an Express app, add a `/api/health` route that returns `{ status: 'ok' }`. Always include `Access-Control-Allow-Origin: *`.
5. **Add the app to `APPS[]`** in `central/central/src/config/apps.ts`:
   ```ts
   {
     id: 'your-app',
     name: 'Your App',
     shortName: 'your-app',
     description: '…',
     path: '/<your-app-path>/',
     localPort: 3004,
     accentColor: '#ABC123',
     glowColor: rgba('#ABC123', 0.6),
     effectType: 'neon',
     imagePath: '/elements/your-app.png',
     icon: '🛰',
     statusEndpoint: '/api/health',
   }
   ```
6. **Drop a shield image** at `central/central/public/elements/your-app.png`.
7. **Add a `Start-AppDetached` call** in `start-all-dev.ps1` for port 3004.
8. **Add an entry to `SUBPROJECTS`** in `scripts/build.mjs`:
   ```js
   {
     name: 'Your App',
     dir: 'central/your-app',
     prefix: 'your-app-path',
     buildCmd: 'node',
     buildArgs: ['node_modules/vite/bin/vite.js', 'build'],
   },
   ```
9. **Add an SPA fallback** in `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/your-app-path/*"
     to   = "/your-app-path/index.html"
     status = 200
   ```
10. **Done.** The hub reads `APPS[]` and renders a new shield card automatically; the build orchestrator picks up the new entry; Netlify serves the new sub-path.

## Files of interest

- `central/central/src/App.tsx` — top-level routes (`/`, `*`).
- `central/central/src/config/apps.ts` — app registry, `HUB_MODE`, `getAppUrl`, `getAppHealthUrl`.
- `central/central/src/pages/Home.tsx` — Relic Shields grid; embeds `<HealthDot>` per card.
- `central/central/src/components/HealthDot.tsx` — pings `/api/health` once on mount, paints the dot.
- `central/central/src/components/ShieldCard.tsx` — 3D-tilt card with electric border.
- `central/central/src/components/{TopBanner,SystemStatusBar,Galaxy}.tsx` — hub chrome.
- `central/central/vite.config.ts` — port 3000, manualChunks, base `'/'`.
- `central/central/netlify.toml` — legacy per-site config (no longer used; the parent `netlify.toml` wins).
- `central/central/.env.example` — `VITE_HUB_MODE` and `VITE_BASE_DOMAIN` knobs.
- `central/central/DEPLOY.md` — historical deployment notes; superseded by the parent `netlify.toml`.
- `central/<sub-app>/vite.config.ts` — each sub-app's `base` + `server.port` config.
- `central/PetroShield_Finance-CyberSec/server.ts` — Express + Prisma server; `process.env.PORT ?? 3002`.
- `scripts/build.mjs` — orchestrates the 4 builds; run via `bun run build` (or `node scripts/build.mjs`).
- `scripts/{clean,test,lint}.mjs` — supporting root-level scripts.
- `netlify.toml` (at repo root) — the single Netlify config. `command = "bun run build"`, `publish = "dist"`.
- `.gitmodules` — the 3 submodule entries.
- `.gitignore` — excludes `node_modules/`, `dist/`, `*.png` (with sub-folder exceptions), `.netlify/`, `_external/`, etc.
