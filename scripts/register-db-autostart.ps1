[CmdletBinding()]
param(
  [switch]$SkipTask,
  [switch]$SkipShortcut
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $scriptDir '..')).Path
$startScript = Join-Path $scriptDir 'start-local-postgres.ps1'
$shortcutCommand = Join-Path $scriptDir 'start-local-postgres.cmd'
$taskName = '7th RND Manager Local PostgreSQL'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

if (!(Test-Path $startScript)) {
  throw "Start script was not found: $startScript"
}

if (!$SkipTask) {
  $taskRun = "`"$powershell`" -NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
  $taskExitCode = 1
  $taskOutput = $null
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'

  try {
    $taskOutput = & schtasks.exe /Create /TN $taskName /TR $taskRun /SC ONLOGON /RL LIMITED /F 2>&1
    $taskExitCode = $LASTEXITCODE
  } catch {
    $taskOutput = $_.Exception.Message
    $taskExitCode = 1
  } finally {
    $script:ErrorActionPreference = $previousErrorActionPreference
  }

  if ($taskExitCode -eq 0) {
    Write-Host "Registered startup task: $taskName"
  } else {
    $runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    $runName = '7thRNDManagerLocalPostgreSQL'
    $runValue = "`"$powershell`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""

    New-Item -Path $runKey -Force | Out-Null
    Set-ItemProperty -Path $runKey -Name $runName -Value $runValue

    Write-Host "Registered user startup entry: $runName"
    Write-Host "Task Scheduler registration was not available; used the current-user startup registry instead."
  }
}

if (!$SkipShortcut) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  if ([string]::IsNullOrWhiteSpace($desktop) -or !(Test-Path $desktop)) {
    throw 'Desktop folder was not found.'
  }

  $shortcutPath = Join-Path $desktop '7th RND DB Start.lnk'
  $cmd = Join-Path $env:SystemRoot 'System32\cmd.exe'
  $icon = Join-Path $root '.postgresql\pgsql\bin\postgres.exe'

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $cmd
  $shortcut.Arguments = "/c `"$shortcutCommand`""
  $shortcut.WorkingDirectory = $root
  $shortcut.Description = 'Start local PostgreSQL for 7th RND Manager'
  if (Test-Path $icon) {
    $shortcut.IconLocation = "$icon,0"
  }
  $shortcut.Save()

  Write-Host "Created desktop shortcut: $shortcutPath"
}
