[CmdletBinding()]
param(
  [switch]$SkipStartup,
  [switch]$SkipShortcut
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $scriptDir '..')).Path
$startScript = Join-Path $scriptDir 'start-local-site.ps1'
$shortcutCommand = Join-Path $scriptDir 'start-local-site.cmd'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$cmd = Join-Path $env:SystemRoot 'System32\cmd.exe'

if (!(Test-Path $startScript)) {
  throw "Site start script was not found: $startScript"
}

if (!$SkipStartup) {
  $runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
  $runName = '7thRNDManagerLocalSite'
  $runValue = "`"$powershell`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`" -OpenBrowser"

  New-Item -Path $runKey -Force | Out-Null
  Set-ItemProperty -Path $runKey -Name $runName -Value $runValue

  Write-Host "Registered user startup entry: $runName"
}

if (!$SkipShortcut) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  if ([string]::IsNullOrWhiteSpace($desktop) -or !(Test-Path $desktop)) {
    throw 'Desktop folder was not found.'
  }

  $shortcutPath = Join-Path $desktop '7th RND Site Start.lnk'
  $icon = Join-Path $root 'app\favicon.ico'

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $cmd
  $shortcut.Arguments = "/c `"$shortcutCommand`""
  $shortcut.WorkingDirectory = $root
  $shortcut.Description = 'Start the local 7th RND Manager site'
  if (Test-Path $icon) {
    $shortcut.IconLocation = "$icon,0"
  }
  $shortcut.Save()

  Write-Host "Created desktop shortcut: $shortcutPath"
}
