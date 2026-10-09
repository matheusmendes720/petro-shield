#!/usr/bin/env node
/**
 * Orchestrated build for the PetroShield unified monorepo.
 *
 * Steps:
 *   1. Clean any prior `dist/` at the repo root.
 *   2. Build each sub-project sequentially with `npm run build`.
 *      (Parallel is tempting but the log output gets interleaved and the
 *      total time is dominated by Finance's Prisma generate, not by the
 *      Vite builds — so sequential is clearer for ~equal wall-clock.)
 *   3. Hoist each sub-project's `dist/` to the repo root `dist/<path>/`.
 *      The hub itself goes to `dist/` (no prefix).
 *   4. Print the final `dist/` tree for verification.
 *
 * Cross-platform: pure Node, no shell-specific paths. Works on Windows
 * (this dev box) and Linux (Netlify build image) identically.
 */

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

/** Each entry: { dir, prefix, name, buildCmd, buildArgs }. prefix '' means root of dist/. */
const SUBPROJECTS = [
  {
    name: 'hub (PetroShield unified SPA)',
    dir: 'central/central',
    prefix: '',
    // Hub runs tsc -b first (project references) then vite build.
    buildCmd: 'node',
    buildArgs: ['node_modules/typescript/bin/tsc', '-b'],
    afterCmd: 'node',
    afterArgs: ['node_modules/vite/bin/vite.js', 'build'],
  },
  {
    name: 'AXE-Guard Shell',
    dir: 'central/AXE-Guard_Muilti_Agents-Shell',
    prefix: 'axe-guard',
    buildCmd: 'node',
    buildArgs: ['node_modules/vite/bin/vite.js', 'build'],
  },
  {
    name: 'PetroShield Finance-CyberSec',
    dir: 'central/PetroShield_Finance-CyberSec',
    prefix: 'petroshield-finance',
    buildCmd: 'node',
    buildArgs: ['node_modules/vite/bin/vite.js', 'build'],
  },
  {
    name: 'SOC-sys Dashboard',
    dir: 'central/SOC-sys_Dashboard',
    prefix: 'soc-sys',
    buildCmd: 'node',
    buildArgs: ['node_modules/vite/bin/vite.js', 'build'],
  },
]

const log = (msg) => process.stdout.write(`${msg}\n`)
const err = (msg) => process.stderr.write(`${msg}\n`)

function step(msg) {
  log(`\n\u001b[36m\u25B6\u001b[0m ${msg}`)
}

function ok(msg) {
  log(`  \u001b[32m\u2713\u001b[0m ${msg}`)
}

function fail(msg) {
  err(`  \u001b[31m\u2717\u001b[0m ${msg}`)
  process.exit(1)
}

// 1. Clean
step('Cleaning prior dist/ at repo root')
const rootDist = join(repoRoot, 'dist')
if (existsSync(rootDist)) {
  rmSync(rootDist, { recursive: true, force: true })
  ok(`removed ${relative(repoRoot, rootDist)}`)
} else {
  ok('nothing to clean')
}
mkdirSync(rootDist, { recursive: true })

// 2. Build each
for (const sub of SUBPROJECTS) {
  const subPath = join(repoRoot, sub.dir)
  step(`Building ${sub.name} (${sub.dir})`)

  if (!existsSync(subPath)) {
    fail(`path not found: ${sub.dir}`)
  }
  if (!existsSync(join(subPath, 'node_modules'))) {
    fail(`no node_modules in ${sub.dir} — run 'npm install' (or 'bun install') first`)
  }

  // Direct node invocation (bypasses npm-script shim, which is flaky on
  // Windows when invoked via spawnSync with shell:true).
  const t0 = Date.now()
  const r1 = spawnSync(sub.buildCmd, sub.buildArgs, {
    cwd: subPath,
    stdio: 'inherit',
  })
  if (r1.status !== 0) {
    fail(`build failed in ${sub.dir} (exit ${r1.status})`)
  }
  if (sub.afterCmd) {
    const r2 = spawnSync(sub.afterCmd, sub.afterArgs, { cwd: subPath, stdio: 'inherit' })
    if (r2.status !== 0) {
      fail(`build failed in ${sub.dir} (exit ${r2.status})`)
    }
  }
  ok(`${sub.name} built in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  // 3. Hoist
  const srcDist = join(subPath, 'dist')
  if (!existsSync(srcDist)) {
    fail(`${sub.dir}/dist not produced`)
  }
  const target = sub.prefix ? join(rootDist, sub.prefix) : rootDist
  mkdirSync(target, { recursive: true })
  cpSync(srcDist, target, { recursive: true })
  ok(`hoisted \u2192 dist/${sub.prefix}`)
}

// 4. Print tree
step('Final dist/ tree')
function walk(dir, prefix = '') {
  const entries = readdirSync(dir).sort()
  for (const e of entries) {
    const p = join(dir, e)
    const rel = relative(rootDist, p)
    const s = statSync(p)
    if (s.isDirectory()) {
      log(`  ${prefix}\u251C\u2500\u2500 ${e}/`)
      walk(p, prefix + '  ')
    } else {
      const size = s.size < 1024 ? `${s.size} B` : `${(s.size / 1024).toFixed(1)} KB`
      log(`  ${prefix}\u2514\u2500\u2500 ${e}  (${size})`)
    }
  }
}
walk(rootDist)

log(`\n\u001b[32m\u2713 Unified build complete.\u001b[0m`)
log(`Publish dir: dist/   (configure Netlify's "publish" setting to this path)`)
