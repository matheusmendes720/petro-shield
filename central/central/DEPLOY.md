# AxeGuard Unified Hub — Deployment Guide

## Overview
This is the **central gateway** app. It hosts 3D cyber-styled cards that redirect users to your three Netlify-deployed sub-apps.

## Architecture
```
https://petroshield.netlify.app/              ← This Hub (central)
    ├── /go/axe-guard          → Redirects to AXE-Guard Shell
    ├── /go/petroshield-finance → Redirects to PetroShield FC
    └── /go/soc-sys            → Redirects to SOC-sys Dashboard
```

## 1. Deploy Each App to Netlify

### Option A: Branch Subdomains (easiest)
For each app, deploy as a **separate Netlify site** or use **branch subdomains**:

| App | Branch | Subdomain |
|-----|--------|-----------|
| AXE-Guard Shell | `main` | `axe-guard--petroshield.netlify.app` |
| PetroShield FC | `main` | `petroshield-finance--petroshield.netlify.app` |
| SOC-sys Dashboard | `main` | `soc-sys--petroshield.netlify.app` |

> Netlify branch subdomains format: `https://<branch>--<site-name>.netlify.app`

### Option B: Separate Sites / Custom Domains
Deploy each as its own site and map custom domains:
- `https://axe-guard.your-domain.com`
- `https://finance.your-domain.com`
- `https://soc.your-domain.com`

## 2. Configure the Hub

Create `central/.env`:

```bash
# Branch subdomain mode
VITE_BASE_DOMAIN=petroshield.netlify.app

# OR custom domain mode (uncomment these)
# VITE_AXE_GUARD_URL=https://axe-guard.your-domain.com
# VITE_PETROSHIELD_FC_URL=https://finance.your-domain.com
# VITE_SOC_SYS_URL=https://soc.your-domain.com
```

Then rebuild:
```bash
cd central
npm run build
```

## 3. Deploy the Hub to Netlify

### Via Netlify CLI
```bash
cd central
netlify deploy --prod --dir=dist
```

### Via Drag & Drop
Upload the `central/dist` folder to Netlify.

## 4. SPA Routing
The included `public/_redirects` and `netlify.toml` ensure React Router works:
```
/*    /index.html   200
```

## 5. Cross-Origin Notes
- The redirect gate uses `window.location.href = url` (full navigation), so **no CORS issues**.
- Each app loads in its own origin — full sandboxing.

## Files Changed
| File | Purpose |
|------|---------|
| `src/config/apps.ts` | Subdomain registry & env overrides |
| `src/pages/Home.tsx` | Card grid with external links |
| `src/pages/RedirectGate.tsx` | Animated "connecting..." handoff screen |
| `src/App.tsx` | Routes: `/`, `/go/:appId` |
| `src/components/SystemStatusBar.tsx` | Shows active relay target |
| `public/_redirects` | Netlify SPA fallback |
| `netlify.toml` | Build settings & headers |
