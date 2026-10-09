# start-all-dev.ps1 — launch all four Vite/Express dev servers under the hub
#
# Usage:  .\start-all-dev.ps1            # start all four
#         .\start-all-dev.ps1 -OnlyHub  # just the hub (when sub-apps are already running)
#
# Each sub-app is launched as a detached process (Start-Process) so the
# parent bash doesn't kill it on timeout. Stdout/stderr is captured to
# `.logs\<app>.log` so you can `Get-Content .logs\hub.log -Wait` to tail.
# Use .\stop-all-dev.ps1 to tear them all down.
#
# Runtime: prefers Bun when installed (faster install, faster boot). Falls
# back to Node + the `node node_modules/...` PATH-quirk workaround when
# Bun is not on PATH. Get Bun: https://bun.sh (PowerShell: `irm bun.sh/install.ps1 | iex`)
#
# Port allocation (kept in sync with central/central/src/config/apps.ts and
# each sub-project's vite.config.ts / server.ts):
#   hub       : 3000   (central/central/)             — Vite
#   axe-guard : 3001   (central/AXE-Guard_.../)       — Vite
#   finance   : 3002   (central/PetroShield_.../)     — tsx server.ts (Prisma 7)
#   soc-sys   : 3003   (central/SOC-sys_Dashboard/)   — Vite
#
# Hub architecture: see central\central\HUB_ARCHITECTURE.md

[CmdletBinding()]
param(
  [switch]$OnlyHub,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logsDir = Join-Path $root '.logs'
if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# ── Runtime selection ────────────────────────────────────────────────────
$bun = Get-Command bun -ErrorAction SilentlyContinue
if ($bun) {
  $runtime = 'bun'
  Write-Host "Runtime: Bun $($bun.Source)" -ForegroundColor Cyan
} else {
  $runtime = 'node'
  Write-Host "Runtime: Node (Bun not on PATH — install from https://bun.sh for faster boot)" -ForegroundColor Yellow
}

# Choose the right launch invocation per runtime.
# Bun: `bun run dev` (puts node_modules/.bin on PATH automatically).
# Node: `node node_modules/<bin>.js` (PATH-quirk workaround on this machine).
function Get-LaunchCmd {
  param(
    [string]$SubProject,         # e.g. "central\AXE-Guard_Muilti_Agents-Shell"
    [string]$NodeBinRelativePath # e.g. "node_modules/vite/bin/vite.js"  (used when runtime = node)
  )
  if ($script:runtime -eq 'bun') {
    return @{ Cmd = 'bun'; Args = @('run', 'dev') }
  }
  return @{ Cmd = 'node'; Args = @($NodeBinRelativePath) }
}

function Start-AppDetached {
  param(
    [string]$Label,
    [string]$RelPath,
    [int]$Port,
    [string]$Cmd,
    [string[]]$Args
  )

  $appPath = Join-Path $root $RelPath
  if (-not (Test-Path $appPath)) {
    Write-Host "  [SKIP] $Label — path not found: $RelPath" -ForegroundColor Yellow
    return
  }
  if (-not (Test-Path (Join-Path $appPath 'node_modules'))) {
    Write-Host "  [SKIP] $Label — no node_modules. Run 'npm install' (or 'bun install') first." -ForegroundColor Yellow
    return
  }

  $safeLabel = ($Label -replace '[^A-Za-z0-9_-]', '_')
  $logPath = Join-Path $logsDir "$safeLabel.log"

  # Detached: cmd.exe's own `2>&1` merges stderr into stdout, so a single
  # `-RedirectStandardOutput` is enough. -PassThru so we can capture the
  # PID. No -Wait so we return immediately. The child process outlives
  # the calling bash (no 1-hour limit).
  $argList = @('/c', "cd /d `"$appPath`" && $Cmd $($Args -join ' ') 2>&1")
  $proc = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList $argList `
    -WindowStyle Hidden `
    -RedirectStandardOutput $logPath `
    -PassThru

  Write-Host "  [OK]  $Label  ->  http://localhost:$Port  (pid $($proc.Id), log: .logs\$safeLabel.log)" -ForegroundColor Green
  Start-Sleep -Milliseconds 400
}

# ── Hub (3000) ───────────────────────────────────────────────────────────
$hub = Get-LaunchCmd -SubProject 'central\central' -NodeBinRelativePath 'node_modules/vite/bin/vite.js'
Start-AppDetached -Label 'hub (3000)' -RelPath 'central\central' -Port 3000 `
  -Cmd $hub.Cmd -Args $hub.Args

if (-not $OnlyHub) {
  # ── AXE-Guard (3001) ────────────────────────────────────────────────────
  $axe = Get-LaunchCmd -SubProject 'central\AXE-Guard_Muilti_Agents-Shell' -NodeBinRelativePath 'node_modules/vite/bin/vite.js'
  Start-AppDetached -Label 'axe-guard (3001)' -RelPath 'central\AXE-Guard_Muilti_Agents-Shell' -Port 3001 `
    -Cmd $axe.Cmd -Args $axe.Args

  # ── SOC-sys (3003) ──────────────────────────────────────────────────────
  $soc = Get-LaunchCmd -SubProject 'central\SOC-sys_Dashboard' -NodeBinRelativePath 'node_modules/vite/bin/vite.js'
  Start-AppDetached -Label 'soc-sys (3003)' -RelPath 'central\SOC-sys_Dashboard' -Port 3003 `
    -Cmd $soc.Cmd -Args $soc.Args

  # ── Finance (3002) ──────────────────────────────────────────────────────
  $fin = Get-LaunchCmd -SubProject 'central\PetroShield_Finance-CyberSec' -NodeBinRelativePath 'node_modules/tsx/dist/cli.mjs'
  Start-AppDetached -Label 'finance (3002)' -RelPath 'central\PetroShield_Finance-CyberSec' -Port 3002 `
    -Cmd $fin.Cmd -Args ($fin.Args + @('server.ts'))
}

Write-Host ""
Write-Host "Logs: $logsDir\  (tail with: Get-Content .logs\hub.log -Wait)" -ForegroundColor Cyan

# ── Bind summary — probe each port and report OK / FAIL ──────────────────
$ports = @(3000, 3001, 3002, 3003)
Write-Host ""
Write-Host "Bind summary (probe each port):" -ForegroundColor Cyan
Start-Sleep -Milliseconds 1500
foreach ($p in $ports) {
  $conn = Test-NetConnection -Port $p -WarningAction SilentlyContinue -InformationLevel Quiet
  if ($conn) {
    Write-Host "  [OK]   :$p  listening" -ForegroundColor Green
  } else {
    Write-Host "  [FAIL] :$p  not listening — check .logs\*.log" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Once ports bind, open the hub: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Tear down:  .\stop-all-dev.ps1" -ForegroundColor Cyan

if (-not $NoOpen) {
  Start-Sleep -Milliseconds 500
  Start-Process 'http://localhost:3000' | Out-Null
}
