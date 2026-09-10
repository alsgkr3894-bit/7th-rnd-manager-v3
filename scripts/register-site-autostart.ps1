[CmdletBinding()]
param(
  [switch]$SkipStartup,
  [switch]$SkipShortcut,
  # 로그인 이전, 부팅 시점에 SYSTEM 권한으로 미리 띄우고 싶을 때 사용.
  # 관리자 권한으로 실행해야 하며, schtasks 등록 실패 시 예외를 던진다
  # (레지스트리 방식과 달리 조용히 건너뛰지 않음 — 등록 여부를 반드시 알 수 있어야 함).
  [switch]$OnBoot
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

  # New-Item -Force on an ALREADY-EXISTING key wipes every other value under it
  # (confirmed: this is what deleted 5 unrelated startup entries in 2026-09).
  # Only create the key when it is missing; never call New-Item -Force on it again.
  if (!(Test-Path $runKey)) {
    New-Item -Path $runKey -Force | Out-Null
  }
  Set-ItemProperty -Path $runKey -Name $runName -Value $runValue

  Write-Host "Registered user startup entry: $runName"
}

if ($OnBoot) {
  # 로그인 없이도 시작해야 하므로 HKCU Run은 못 쓴다(로그인 시점에만 실행됨) — 작업 스케줄러의
  # SC ONSTART + RU SYSTEM 조합만 로그인 이전 부팅 단계에서 동작한다.
  # -OpenBrowser는 제외한다: SYSTEM 세션에는 표시할 데스크톱/브라우저가 없다.
  $taskName = '7th RND Manager Site (Boot)'
  $taskRun = "`"$powershell`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""

  $taskOutput = & schtasks.exe /Create /TN $taskName /TR $taskRun /SC ONSTART /RU SYSTEM /RL HIGHEST /F 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to register boot-time scheduled task '$taskName' (exit $LASTEXITCODE). Run this script as Administrator.$([Environment]::NewLine)$taskOutput"
  }

  Write-Host "Registered boot-time scheduled task: $taskName"
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
