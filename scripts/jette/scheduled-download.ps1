# scripts/jette/scheduled-download.ps1
# Windows 작업 스케줄러에서 매일 실행되는 래퍼: 제때 단가 엑셀 자동 다운로드.
# 결과(성공/실패)를 scripts/jette/logs/price-download.log 에 이어서 기록한다.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'price-download.log'

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logFile -Value "`n=== $stamp 실행 시작 ==="

try {
    $output = & node "scripts/jette/download.mjs" download price 2>&1 | Out-String
    Add-Content -Path $logFile -Value $output
    if ($LASTEXITCODE -ne 0) {
        Add-Content -Path $logFile -Value "=== 실패 (exit $LASTEXITCODE) — 세션 만료일 수 있음. 'npm run jette:login' 재실행 필요 ==="
    } else {
        Add-Content -Path $logFile -Value "=== 성공 ==="
    }
} catch {
    Add-Content -Path $logFile -Value "=== 예외 발생: $($_.Exception.Message) ==="
}
