# stop-all-dev.ps1 — kill all four dev servers launched by start-all-dev.ps1
#
# Usage:  .\stop-all-dev.ps1
#
# Kills anything bound to the four hub ports (3000-3003). If a port has no
# listener, prints [skip]. Safe to run when sub-apps aren't running.

$ErrorActionPreference = 'SilentlyContinue'
$ports = @(3000, 3001, 3002, 3003)

Write-Host "Stopping hub + 3 sub-app dev servers:" -ForegroundColor Cyan

foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if (-not $conns) {
    Write-Host "  [skip] :$port — nothing listening"
    continue
  }
  foreach ($c in $conns) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "  [ok]   :$port — killed pid $($c.OwningProcess)"
  }
}

# Also kill any leftover cmd.exe windows titled "PetroShield ::" — the
# ones Start-Process launched. These don't hold the port themselves, but
# they spawn the actual node process; killing them cleans up the parent.
Get-Process cmd -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -like 'PetroShield ::*' } |
  ForEach-Object {
    Write-Host "  [ok]   cmd window '$($_.MainWindowTitle)' — killed pid $($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }

Write-Host ""
Write-Host "Done." -ForegroundColor Green