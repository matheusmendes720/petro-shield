/**
 * AxeGuard Central Hub — Sub-App Registry
 *
 * In the unified-Netlify-build model, every sub-app lives at a sub-path of
 * the single Netlify site:
 *
 *   /                       ← this hub
 *   /axe-guard/             ← AXE-Guard Shell
 *   /petroshield-finance/   ← PetroShield Finance-CyberSec
 *   /soc-sys/               ← SOC-sys Dashboard
 *
 * In local dev the sub-apps run on their own localhost ports (3001/3002/3003)
 * and the hub navigates to them directly. In prod the hub navigates to the
 * sub-path under the single Netlify site.
 */

export interface AppConfig {
  id: string
  name: string
  shortName: string
  description: string
  /** Sub-path under the Netlify site where the sub-app's `dist/` is served. */
  path: string
  /** Localhost port the sub-app's dev server binds to (dev only). */
  localPort: number
  /** Hex color used for solid accents (text, borders, glows). */
  accentColor: string
  /** Halo color used at low opacity. Derived from accentColor via rgba(). */
  glowColor: string
  effectType: 'fire' | 'neon' | 'electric'
  imagePath: string
  icon: string
  statusEndpoint?: string
}

/** Build an rgba() string from a #RRGGBB hex + alpha. */
export function rgba(color: string, alpha: number): string {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** ── Detect localhost / dev mode ────────────────────────────────────── */
/**
 * Hub mode. Drives the iframe-vs-redirect-gate decision in `getAppUrl()`.
 *
 * - `VITE_HUB_MODE=local`  → iframe embed (sub-app runs on the assigned
 *                            localhost port; hub owns chrome).
 * - `VITE_HUB_MODE=prod`   → external Netlify subdomain via RedirectGate.
 * - unset                  → fall back to hostname sniff (legacy behavior).
 */
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

/** @deprecated kept for any external consumer; use HUB_MODE === 'local' instead. */
export const IS_LOCAL = HUB_MODE === 'local'

/** Get the correct URL for an app.
 * - Local dev → `http://localhost:<localPort>/` (sub-app's own dev server)
 * - Prod      → `<path>` (sub-path under the unified Netlify site)
 */
export function getAppUrl(app: AppConfig): string {
  if (HUB_MODE === 'local') return `http://localhost:${app.localPort}/`
  return app.path
}

/**
 * Get the absolute health-check URL for an app.
 * - Local dev → `http://localhost:<localPort>/api/health` (Vite middleware
 *               in the sub-app's dev server; CORS `*` enabled).
 * - Prod      → `<path>/api/health` (typically 404 — Vite middleware does
 *               not exist in the static build; the HealthDot will flip red).
 */
export function getAppHealthUrl(app: AppConfig): string {
  if (HUB_MODE === 'local') {
    return `http://localhost:${app.localPort}/api/health`
  }
  return `${app.path.replace(/\/$/, '')}/api/health`
}

/** ── App Registry ───────────────────────────────────────────────────── */
export const APPS: AppConfig[] = [
  {
    id: 'axe-guard',
    name: 'AXE-Guard Multi-Agent Shell',
    shortName: 'AXE-Guard',
    description:
      'TUI + Executive Dashboard split-screen. Real-time agent lifecycle, MITRE ICS tactics, and AxeTorch flame analytics.',
    path: '/axe-guard/',
    localPort: 3001,
    accentColor: '#00FFFF',
    glowColor: rgba('#00FFFF', 0.6),
    effectType: 'neon',
    imagePath: '/elements/axe_guard.png',
    icon: '🛡️',
    statusEndpoint: '/api/health',
  },
  {
    id: 'soc-sys',
    name: 'SOC-sys Dashboard',
    shortName: 'SOC-sys',
    description:
      'Pro-grade Bento Grid with 8-stage SOC lifecycle. Real-time CPU/Network dual-area charts and packet entropy analysis.',
    path: '/soc-sys/',
    localPort: 3003,
    accentColor: '#00FF41',
    glowColor: rgba('#00FF41', 0.6),
    effectType: 'electric',
    imagePath: '/elements/soc_admin.png',
    icon: '⚡',
    statusEndpoint: '/api/health',
  },
  {
    id: 'petroshield-finance',
    name: 'PetroShield Finance-CyberSec',
    shortName: 'PetroShield FC',
    description:
      'Glassmorphism cyber-ops Nebula SOC. Recharts + D3 threat maps, vendor risk spotlight, and C-Level econometrics.',
    path: '/petroshield-finance/',
    localPort: 3002,
    accentColor: '#FF6200',
    glowColor: rgba('#FF6200', 0.6),
    effectType: 'fire',
    imagePath: '/elements/fin-anchor.png',
    icon: '🌐',
    statusEndpoint: '/api/health',
  },
]

export const APPS_BY_ID = Object.fromEntries(APPS.map((a) => [a.id, a]))
