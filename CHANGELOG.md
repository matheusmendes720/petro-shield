# Changelog

All notable changes to the **PetroShield** unified monorepo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases are managed by [release-please](https://github.com/googleapis/release-please) on every push to `main`. Conventional commits are required: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`, `ci:`, `test:`, `build:` — and `BREAKING CHANGE:` in the footer.

## [Unreleased]

### Added

- **Unified monorepo** with the hub at `central/central/` and three sub-app submodules (`central/AXE-Guard_Muilti_Agents-Shell`, `central/SOC-sys_Dashboard`, `central/PetroShield_Finance-CyberSec`).
- **Single Netlify project** hosting all four pages as sub-paths of one build: `/`, `/axe-guard/`, `/soc-sys/`, `/petroshield-finance/`.
- **Sub-page routing** (real navigation, no iframes) — each sub-app declares its `base: '/<sub-path>/'` in `vite.config.ts` and `getAppUrl()` in the hub returns the matching URL.
- **Build orchestrator** (`scripts/build.mjs`) that runs `tsc -b` + `vite build` for each sub-project, then hoists the resulting `dist/` into the repo root.
- **Vitest smoke tests** in each sub-project (20 tests total).
- **`/api/health` endpoint** in each sub-app (Vite middleware in AXE-Guard + SOC-sys, Express route in Finance). Dev-only — Netlify static build 404s the path.
- **GitHub Actions** — `ci.yml` (lint + test + build on PR/push to main) and `release-please.yml` (auto-bump version + CHANGELOG on main).

### Removed

- Per-sub-app GHA workflows (`.github/workflows/ci.yml`, `release.yml`) and per-sub-app `netlify.toml` — replaced by the parent-level workflow.
- The `AppFrame` and `RedirectGate` components from the hub — no more iframe embedding, no more 3-second redirect gate.

### Known limitations

- **Finance's Express backend is dev-only.** The static `dist/petroshield-finance/` deploys, but `/api/*` 404s in prod. Convert to Netlify Functions or deploy `server.ts` to a Node host to ship the API.
- **Submodules in this repo point at GitHub URLs** (`https://github.com/720matheusmendes/...`). On a fresh clone, `git submodule update --init --recursive` is required.
- **Bun is the canonical runtime** for builds. CI uses `oven-sh/setup-bun@v2`. Locally, `npm run build` works as a fallback.
