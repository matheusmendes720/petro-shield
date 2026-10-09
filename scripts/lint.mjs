#!/usr/bin/env node
/**
 * Lint orchestrator — runs `npm run lint` in each sub-project. The hub
 * uses `npx tsc -b` (no `lint` script), so we special-case it.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const SUBPROJECTS = [
  { path: 'central/central', cmd: 'npx', args: ['tsc', '-b'] },
  { path: 'central/AXE-Guard_Muilti_Agents-Shell', cmd: 'npm', args: ['run', 'lint'] },
  { path: 'central/SOC-sys_Dashboard', cmd: 'npm', args: ['run', 'lint'] },
  { path: 'central/PetroShield_Finance-CyberSec', cmd: 'npm', args: ['run', 'lint'] },
]

let failed = 0
for (const sub of SUBPROJECTS) {
  const subPath = join(repoRoot, sub.path)
  process.stdout.write(`\n\u001b[36m\u25B6\u001b[0m ${sub.path}\n`)
  if (!existsSync(join(subPath, 'node_modules'))) {
    process.stdout.write(`  \u001b[33m\u26A0\u001b[0m  no node_modules — skipping\n`)
    continue
  }
  const r = spawnSync(sub.cmd, sub.args, { cwd: subPath, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) failed++
}

if (failed > 0) {
  process.stderr.write(`\n\u001b[31m\u2717 ${failed} sub-project(s) failed lint.\u001b[0m\n`)
  process.exit(1)
}
process.stdout.write(`\n\u001b[32m\u2713 All sub-projects linted clean.\u001b[0m\n`)
