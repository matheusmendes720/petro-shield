#!/usr/bin/env node
/**
 * Clean — removes the parent dist/ and each sub-project's dist/. Leaves
 * node_modules/ in place (use `rimraf node_modules` separately if you
 * want a full reset).
 */

import { existsSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const TARGETS = [
  'dist',
  'central/central/dist',
  'central/AXE-Guard_Muilti_Agents-Shell/dist',
  'central/SOC-sys_Dashboard/dist',
  'central/PetroShield_Finance-CyberSec/dist',
]

for (const t of TARGETS) {
  const p = join(repoRoot, t)
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true })
    process.stdout.write(`  \u2713 removed ${t}\n`)
  } else {
    process.stdout.write(`  - skip ${t} (not present)\n`)
  }
}
process.stdout.write(`\n\u001b[32m\u2713 Clean done.\u001b[0m\n`)
