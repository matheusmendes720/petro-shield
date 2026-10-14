# scripts/sync.ps1 — one-shot local → GitHub sync.
#
# What it does:
#   1. git pull --rebase --autostash origin main   (linear history, no merge commits)
#   2. git add -A
#   3. git commit -m <Message>                       (skips if nothing staged)
#   4. git push origin main
#
# Why this exists: replace the 4-step ritual of (add + commit + push) with
# one command while iterating on the parent. Safe to run repeatedly — it's
# a no-op when the working tree is clean and in sync with origin/main.
#
# Important: this script only pushes to GitHub. It does NOT trigger any
# Netlify deploy. The Netlify GitHub App linkage (which would enable
# auto-deploy on push to main) is a separate, deliberate step the user
# performs in the Netlify dashboard.
#
# Usage:
#   pwsh scripts/sync.ps1                          # uses default commit message
#   pwsh scripts/sync.ps1 -Message "fix: typo in README" -Push
#   pwsh scripts/sync.ps1 -SkipPull                # don't pull first (you already did)
#   pwsh scripts/sync.ps1 -AllowEmpty               # create an empty commit (e.g., to retrigger CI)
#   pwsh scripts/sync.ps1 -DryRun                   # print what would happen, do nothing

[CmdletBinding()]
param(
  [string]$Message = "chore: local sync",
  [switch]$SkipPull,
  [switch]$AllowEmpty,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot | Split-Path -Parent
Set-Location $root

function Step($label) { Write-Host "`n$label" -ForegroundColor Cyan }
function Ok($msg)     { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Warn($msg)   { Write-Host "  [!!]  $msg" -ForegroundColor Yellow }
function Fail($msg)   { Write-Host "  [XX]  $msg" -ForegroundColor Red; exit 1 }

# Sanity checks
if (-not (Test-Path '.git')) { Fail "not a git repo: $root" }
$branch = & git symbolic-ref --short HEAD 2>$null
if ($LASTEXITCODE -ne 0) { Fail "not on a branch (detached HEAD?)" }
if ($branch -ne 'main') { Warn "current branch is '$branch' (expected 'main')" }

if ($DryRun) { Write-Host "[DRY-RUN] no changes will be made" -ForegroundColor Yellow }

# 1. Pull
if (-not $SkipPull) {
  Step "Pull (rebase) from origin/$branch"
  if ($DryRun) { Write-Host "  would run: git pull --rebase --autostash origin $branch" }
  else {
    & git pull --rebase --autostash origin $branch 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) { Fail "git pull failed. Resolve conflicts and retry." }
    Ok "pull ok"
  }
}

# 2. Stage
Step "Stage all changes"
if ($DryRun) { Write-Host "  would run: git add -A" }
else {
  & git add -A
  if ($LASTEXITCODE -ne 0) { Fail "git add failed" }
  Ok "staged"
}

# 3. Decide: commit or skip
# In dry-run, we haven't actually run `git add -A` yet, so the staging
# area is empty. Use `git status --porcelain` instead to see what WOULD
# be staged (untracked + modified). In normal mode, use the real
# `git diff --cached --name-only` after the add.
if ($DryRun) {
  $wouldStage = (& git status --porcelain) 2>$null | Where-Object { $_ -match '^(..|\?\?) ' }
} else {
  $wouldStage = (& git diff --cached --name-only) 2>$null
}

if (-not $wouldStage) {
  if ($AllowEmpty) {
    Step "Create empty commit"
    if ($DryRun) { Write-Host "  would run: git commit --allow-empty -m '$Message'" }
    else {
      & git commit --allow-empty -m $Message 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { Fail "git commit failed" }
      Ok "empty commit created"
    }
  } else {
    Step "No changes to commit"
    Ok "working tree is clean and in sync. Nothing to do."
    exit 0
  }
} else {
  Step "Commit: $Message"
  Write-Host "  files: $($wouldStage.Count)"
  $wouldStage | Select-Object -First 20 | ForEach-Object { Write-Host "    $_" }
  if ($wouldStage.Count -gt 20) { Write-Host "    ... and $($wouldStage.Count - 20) more" }
  if ($DryRun) {
    Write-Host "  would run: git commit -m '$Message'"
  } else {
    & git commit -m $Message 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "git commit failed" }
    Ok "committed"
  }
}

# 4. Push
Step "Push to origin/$branch"
if ($DryRun) { Write-Host "  would run: git push origin $branch" }
else {
  & git push origin $branch 2>&1 | ForEach-Object { Write-Host "  $_" }
  if ($LASTEXITCODE -ne 0) { Fail "git push failed" }
  Ok "pushed"
}

Write-Host "`nDone. Remote is at origin/$branch." -ForegroundColor Green
