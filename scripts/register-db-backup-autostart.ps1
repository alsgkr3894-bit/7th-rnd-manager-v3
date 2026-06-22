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

New-Item -Path $runKey -Force | Out-Null
Set-ItemProperty -Path $runKey -Name $runName -Value $runValue

Write-Host "Registered user startup backup entry: $runName"
Write-Host "Backup command: $runValue"
