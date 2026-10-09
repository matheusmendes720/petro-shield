#!/usr/bin/env node
/**
 * Test orchestrator — runs `npm run test` in each sub-project sequentially
 * and aggregates pass/fail. Exits 0 only if all suites pass.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const SUBPROJECTS = [
  'central/central',
  'central/AXE-Guard_Muilti_Agents-Shell',
  'central/SOC-sys_Dashboard',
  'central/PetroShield_Finance-CyberSec',
]

let failed = 0
for (const sub of SUBPROJECTS) {
  const subPath = join(repoRoot, sub)
  process.stdout.write(`\n\u001b[36m\u25B6\u001b[0m ${sub}\n`)
  if (!existsSync(join(subPath, 'node_modules'))) {
    process.stdout.write(`  \u001b[33m\u26A0\u001b[0m  no node_modules — skipping (run 'npm install' first)\n`)
    continue
  }
  const r = spawnSync('npm', ['run', 'test'], { cwd: subPath, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) failed++
}

if (failed > 0) {
  process.stderr.write(`\n\u001b[31m\u2717 ${failed} suite(s) failed.\u001b[0m\n`)
  process.exit(1)
}
process.stdout.write(`\n\u001b[32m\u2713 All test suites passed.\u001b[0m\n`)
