# PowerShell equivalent of start-dev-fe-be.sh.
# Runs the Vite dev client and the Node dev server side-by-side in this
# single terminal. Each line is prefixed with [be] (cyan) or [fe] (magenta).
# Ctrl+C stops both.
#
# Usage:
#   .\start-dev-fe-be.ps1           # interleaved output in this terminal
#   .\start-dev-fe-be.ps1 -Tee      # also tee to logs\be.log and logs\fe.log

[CmdletBinding()]
param([switch]$Tee)

$ErrorActionPreference = 'Stop'
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

if ($Tee) { New-Item -ItemType Directory -Force -Path 'logs' | Out-Null }

# Use cmd.exe so signal-handling and npm.cmd resolution behave like a
# normal shell invocation. The host shell stays PowerShell.
$beArgs = '/c npm run dev:server 2>&1'
$feArgs = '/c npm run dev:client 2>&1'

$beJob = Start-Job -Name 'be' -ScriptBlock {
  param($a, $tee, $root)
  Set-Location $root
  if ($tee) {
    cmd.exe /c $a | Tee-Object -FilePath (Join-Path $root 'logs\be.log')
  } else {
    cmd.exe /c $a
  }
} -ArgumentList $beArgs, $Tee.IsPresent, (Get-Location).Path

$feJob = Start-Job -Name 'fe' -ScriptBlock {
  param($a, $tee, $root)
  Set-Location $root
  if ($tee) {
    cmd.exe /c $a | Tee-Object -FilePath (Join-Path $root 'logs\fe.log')
  } else {
    cmd.exe /c $a
  }
} -ArgumentList $feArgs, $Tee.IsPresent, (Get-Location).Path

Write-Host "[script] backend  -> http://localhost:1025  (node --watch server.js)"
Write-Host "[script] frontend -> http://localhost:5173  (vite, /api proxied to :1025)"
Write-Host "[script] Ctrl+C to stop both."
if ($Tee) {
  Write-Host "[script] tee enabled - view either stream alone:"
  Write-Host "[script]   Get-Content -Path logs\be.log -Wait    # backend"
  Write-Host "[script]   Get-Content -Path logs\fe.log -Wait    # frontend"
}
Write-Host ""

# Stream both jobs' output to this terminal with colored prefixes.
try {
  while ($beJob.State -eq 'Running' -or $feJob.State -eq 'Running') {
    $beLines = Receive-Job -Job $beJob -Keep:$false
    foreach ($line in $beLines) { Write-Host "[be] $line" -ForegroundColor Cyan }
    $feLines = Receive-Job -Job $feJob -Keep:$false
    foreach ($line in $feLines) { Write-Host "[fe] $line" -ForegroundColor Magenta }
    Start-Sleep -Milliseconds 150
  }
}
finally {
  Write-Host "`n[script] shutting down..."
  Stop-Job -Job $beJob, $feJob -ErrorAction SilentlyContinue
  Remove-Job -Job $beJob, $feJob -Force -ErrorAction SilentlyContinue
  # Best-effort: kill anything still listening on our ports.
  $stragglers = (Get-NetTCPConnection -State Listen -LocalPort 1025, 5173 `
                  -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
  foreach ($p in $stragglers) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
}
