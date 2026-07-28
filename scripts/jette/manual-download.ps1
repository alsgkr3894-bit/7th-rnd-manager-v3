# scripts/jette/manual-download.ps1
# 바탕화면 "제때 단가 다운로드" 바로가기에서 더블클릭으로 실행되는 스크립트.
# 진행 상황을 콘솔에 보여주고, 끝나면 결과를 메시지 박스로 알린 뒤 다운로드 폴더를 연다.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
Add-Type -AssemblyName System.Windows.Forms

$host.UI.RawUI.WindowTitle = '제때 단가 엑셀 다운로드'
Write-Host '제때 단가 엑셀을 다운로드합니다...' -ForegroundColor Cyan
Write-Host ''

$configPath = Join-Path $PSScriptRoot 'jette.config.json'
$downloadDir = $null
if (Test-Path $configPath) {
    try {
        $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
        $downloadDir = $cfg.downloadDir
    } catch {}
}

& node "scripts/jette/download.mjs" download price
$exitCode = $LASTEXITCODE

Write-Host ''
if ($exitCode -eq 0) {
    $folder = if ($downloadDir) { Join-Path $downloadDir 'price' } else { $null }
    [System.Windows.Forms.MessageBox]::Show(
        "단가 엑셀 다운로드가 완료됐습니다.`n`n앱의 /jette/price-compare 업로드 화면에 올려주세요.",
        '제때 단가 다운로드 완료',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
    if ($folder -and (Test-Path $folder)) {
        Start-Process explorer.exe $folder
    }
} else {
    [System.Windows.Forms.MessageBox]::Show(
        "다운로드에 실패했습니다.`n`n로그인 세션이 만료됐을 수 있습니다.`n터미널에서 'npm run jette:login' 을 실행해 다시 로그인해주세요.",
        '제때 단가 다운로드 실패',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
}
