[CmdletBinding()]
param(
  [int]$Hours = 20
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $scriptDir '..')).Path
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runName = '7thRNDManagerLocalPostgreSQLBackup'
$cmd = Join-Path $env:SystemRoot 'System32\cmd.exe'
$runValue = "`"$cmd`" /c cd /d `"$root`" && npm.cmd run db:backup:auto -- --hours $Hours"

# New-Item -Force on an ALREADY-EXISTING key wipes every other value under it
# (confirmed: this is what deleted 5 unrelated startup entries in 2026-09).
# Only create the key when it is missing; never call New-Item -Force on it again.
if (!(Test-Path $runKey)) {
  New-Item -Path $runKey -Force | Out-Null
}
Set-ItemProperty -Path $runKey -Name $runName -Value $runValue

Write-Host "Registered user startup backup entry: $runName"
Write-Host "Backup command: $runValue"
