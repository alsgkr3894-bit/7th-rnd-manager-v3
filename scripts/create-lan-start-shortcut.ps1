[CmdletBinding()]
param()

# 바탕화면에 "사무실 LAN용 서버 시작" 바로가기를 만든다. 더블클릭하면
# start-local-site-lan.cmd 를 실행해 0.0.0.0 바인딩 + RND_ALLOW_LAN=1 로 사이트를 띄운다.
# 자동 시작(로그인 시 실행) 등록은 건드리지 않는다 — 그건 register-site-autostart.ps1 담당.

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $scriptDir '..')).Path
$targetCmd = Join-Path $scriptDir 'start-local-site-lan.cmd'
$cmd = Join-Path $env:SystemRoot 'System32\cmd.exe'

if (!(Test-Path $targetCmd)) {
  throw "LAN start script was not found: $targetCmd"
}

$desktop = [Environment]::GetFolderPath('Desktop')
if ([string]::IsNullOrWhiteSpace($desktop) -or !(Test-Path $desktop)) {
  throw 'Desktop folder was not found.'
}

$shortcutPath = Join-Path $desktop '7th RND Site Start (LAN).lnk'
$icon = Join-Path $root 'app\favicon.ico'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $cmd
$shortcut.Arguments = "/c `"$targetCmd`""
$shortcut.WorkingDirectory = $root
$shortcut.Description = 'Start the 7th RND Manager site for LAN access (other office PCs can connect)'
if (Test-Path $icon) {
  $shortcut.IconLocation = "$icon,0"
}
$shortcut.Save()

Write-Host "Created desktop shortcut: $shortcutPath"
