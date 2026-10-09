# Hub Architecture — PetroShield Unified Hub

`central/central/` is the single entry point for the PetroShield / AxeGuard ecosystem. It serves a Relic Shields landing page that links to three sub-projects. This document explains how the binding works so a future agent can extend it without re-deriving the design.

## Port allocation

Owned by the **sub-project's own config**, not by the orchestration script. The hub and the script just honor it.

| Port | Service | Where the port is set |
| --- | --- | --- |
| **3000** | Hub (this app) | `central/central/vite.config.ts` → `server.port: 3000` |
| **3001** | AXE-Guard Multi-Agents Shell | `central/AXE-Guard_Muilti_Agents-Shell/vite.config.ts` → `server.port: 3001` |
| **3002** | PetroShield Finance-CyberSec | `central/PetroShield_Finance-CyberSec/server.ts` → `process.env.PORT ?? 3002` |
| **3003** | SOC-sys Dashboard | `central/SOC-sys_Dashboard/vite.config.ts` → `server.port: 3003` |

Why each sub-project owns its own port: someone running `npm run dev` in one sub-project (without the orchestration script) shouldn't collide with the hub or the other sub-apps. The orchestration script still passes `--strictPort` defensively.

## Two operating modes

The hub has exactly two URL paths a shield card can land on:

| Route | Mode | What the user sees |
| --- | --- | --- |
| `/app/:appId` | **local** | `<AppFrame>` renders an `<iframe src="http://localhost:<localPort>">`; sub-app stays under the hub chrome. |
| `/go/:appId` | **prod** | `<RedirectGate>` plays a 3-second animated countdown, then `window.location.href = app.url` to the Netlify subdomain. |

The mode is decided by `HUB_MODE` in `src/config/apps.ts`:

```ts
const ENV_MODE = (import.meta.env.VITE_HUB_MODE ?? '').toLowerCase()
const HOSTNAME_IS_LOCAL =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

export const HUB_MODE: 'local' | 'prod' =
  ENV_MODE === 'local' || ENV_MODE === 'prod'
    ? (ENV_MODE as 'local' | 'prod')
    : HOSTNAME_IS_LOCAL
      ? 'local'
      : 'prod'
```

**Resolution order** (first match wins):

1. `VITE_HUB_MODE=local` or `=prod` in `.env.local` (or build env) — explicit override.
2. Hostname sniff: `localhost` or `127.0.0.1` → `local`; everything else → `prod`.
3. Default to `prod` (safe — never accidentally embed a non-local sub-app in an iframe).

`getAppUrl(app)` in `src/config/apps.ts` is the single decision point:

```ts
export function getAppUrl(app: AppConfig): string {
  if (HUB_MODE === 'local') return `/app/${app.id}`
  return app.url
}
```

## Local-mode flow (dev)

```
http://localhost:3000/                ← Hub SPA shell
   │
   ├─ click "AXE-Guard" shield  ──►  getAppUrl('axe-guard')         → '/app/axe-guard'
   │                                       │
   │                                       ▼
   │                                <AppFrame>
   │                                  ├─ HUB button        → navigate('/')
   │                                  ├─ <iframe>          → http://localhost:3001
   │                                  ├─ RELOAD button     → reloadKey++
   │                                  └─ STANDALONE link   → new tab to :3001
   │
   ├─ click "Finance" shield    ──►  /app/petroshield-finance
   │                                       │
   │                                       ▼
   │                                <AppFrame>  →  http://localhost:3002
   │                                       (Express + Vite middleware + Prisma)
   │
   └─ click "SOC-sys" shield    ──►  /app/soc-sys
                                            │
                                            ▼
                                     <AppFrame>  →  http://localhost:3003
```

## Prod-mode flow (Netlify)

```
https://petroshield.netlify.app/      ← Hub static SPA on Netlify edge
   │
   └─ click any shield         ──►   getAppUrl(<id>)                 → app.url
                                            │
                                            ▼
                                     <RedirectGate>
                                       ├─ 3-second countdown
                                       ├─ animated border trace
                                       └─ window.location.href = app.url
                                                │
                                                ▼
                                         https://<id>.petroshield.netlify.app
```

No iframe in prod: each sub-app is on a different origin, so embedding would be blocked by `X-Frame-Options: SAMEORIGIN` (set in `netlify.toml` for the hub) or by the sub-app's own headers. The redirect gate is the canonical hand-off.

## Health endpoint

Every sub-app serves `GET /api/health` so the hub can paint a live status dot on each shield card.

| Sub-app | Implementation | Response |
| --- | --- | --- |
| AXE-Guard (3001) | Vite middleware plugin (`vite.config.ts`) | `{ status: 'ok', app: 'axe-guard' }` |
| Finance (3002) | Express route (`server.ts`) | `{ status: 'ok', db: 'ok', counts: {…}, uptime }` (or 503 if Prisma is down) |
| SOC-sys (3003) | Vite middleware plugin (`vite.config.ts`) | `{ status: 'ok', app: 'soc-sys' }` |

All three respond with `Access-Control-Allow-Origin: *` because the hub fetches them cross-origin. `src/components/HealthDot.tsx` pings each with a 1500 ms `AbortController` timeout. Result mapping:

- 2xx → green dot (`#00FF41`)
- non-2xx / network error / timeout → red dot (`#FF3333`)
- in flight → grey dot

`getAppHealthUrl(app)` in `src/config/apps.ts` is the matching decision point:

```ts
export function getAppHealthUrl(app: AppConfig): string {
  if (HUB_MODE === 'local') {
    return `http://localhost:${app.localPort}/api/health`
  }
  return `${app.url.replace(/\/$/, '')}/api/health`
}
```

## State, isolation, and known limitations

- **State isolation.** Each sub-app is a separate origin (different localhost port in dev, different Netlify subdomain in prod). localStorage, sessionStorage, cookies, and IndexedDB are all per-origin. The hub **cannot** read the sub-app's state and vice-versa.
- **No cross-app messaging today.** If a future agent wants shared theme/auth/alerts across the hub and a sub-app, the right tool is `postMessage` with a typed message contract. Not implemented.
- **No `sandbox` on the iframe.** `<AppFrame>` deliberately omits the `sandbox` attribute because sub-apps need full JS / same-origin / cookies / etc. Same-origin policy between `localhost:3000` and `localhost:3001` already prevents the iframe from reading the hub's storage.
- **Hub git status.** The hub is **not** a git repo of its own (`central/central/` has no `.git/`). Changes here are untracked at the parent workspace level. Consider `git init` + commits if you intend to ship the hub independently.

## How to add a fourth sub-app

1. Create the sub-project at `central/<your-app>/` with its own `package.json`, `vite.config.ts`, and `node_modules` (run `npm install`).
2. Pick a free port (currently 3004 is unused). Set `server: { port: 3004, strictPort: true, host: '0.0.0.0' }` in its `vite.config.ts` (or `process.env.PORT ?? 3004` in its `server.ts` if it's an Express app).
3. Add the app to `APPS[]` in `src/config/apps.ts`:
   ```ts
   {
     id: 'your-app',
     name: 'Your App',
     shortName: 'your-app',
     description: '…',
     subdomain: 'your-app',
     url: makeUrl('your-app'),
     localPort: 3004,
     accentColor: '#ABC123',
     glowColor: rgba('#ABC123', 0.6),
     effectType: 'neon',
     imagePath: '/elements/your-app.png',
     icon: '🛰',
     statusEndpoint: '/api/health',
   }
   ```
4. Drop a shield image at `public/elements/your-app.png`.
5. Make sure the sub-app responds at `GET /api/health` with `Access-Control-Allow-Origin: *`.
6. Add a `Start-AppDetached` call in `start-all-dev.ps1` for port 3004.
7. Done — the hub reads `APPS[]` and renders a new shield card automatically.

## Files of interest (in this directory)

- `src/App.tsx` — routes (`/`, `/app/:appId`, `/go/:appId`, `*`).
- `src/config/apps.ts` — app registry, `HUB_MODE`, `getAppUrl`, `getAppHealthUrl`.
- `src/pages/AppFrame.tsx` — iframe shell with HUB / RELOAD / STANDALONE.
- `src/pages/RedirectGate.tsx` — 3-second prod countdown.
- `src/pages/Home.tsx` — Relic Shields grid; embeds `<HealthDot>` per card.
- `src/components/HealthDot.tsx` — pings `/api/health` once on mount, paints the dot.
- `src/components/ShieldCard.tsx` — 3D-tilt card with electric border.
- `vite.config.ts` — port 3000, manualChunks for vendor split.
- `netlify.toml` + `public/_redirects` — SPA fallback + security headers.
- `.env.example` — `VITE_BASE_DOMAIN` and `VITE_HUB_MODE` knobs.
- `DEPLOY.md` — Netlify deployment notes.
