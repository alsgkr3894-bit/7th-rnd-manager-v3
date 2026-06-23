[CmdletBinding()]
param(
  [switch]$OpenBrowser,
  [switch]$ShowStatus,
  [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $scriptDir '..')).Path
$dbStartScript = Join-Path $scriptDir 'start-local-postgres.ps1'
$siteUrl = 'http://localhost:3000/login'
$healthUrl = 'http://localhost:3000/api/db/health'

function Write-Status {
  param([string]$Message)

  if ($ShowStatus) {
    Write-Host $Message
  }
}

function Test-UrlReady {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 8
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Wait-ForUrl {
  param(
    [string]$Url,
    [int]$Seconds
  )

  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-UrlReady $Url) {
      return $true
    }
    Start-Sleep -Seconds 3
  }

  return $false
}

if (!(Test-Path $dbStartScript)) {
  throw "DB start script was not found: $dbStartScript"
}

Write-Status 'Starting local PostgreSQL if needed...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $dbStartScript
if ($LASTEXITCODE -ne 0) {
  throw "Local PostgreSQL startup failed with exit code $LASTEXITCODE."
}

if (Test-UrlReady $siteUrl) {
  Write-Status 'Local site is already running on http://localhost:3000.'
} else {
  $portOwner = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  if ($portOwner) {
    Write-Status "Port 3000 is already listening by process $($portOwner.OwningProcess). Waiting for the site..."
  } else {
    Write-Status 'Starting local site server on http://localhost:3000...'
    Start-Process `
      -WindowStyle Hidden `
      -FilePath (Join-Path $env:SystemRoot 'System32\cmd.exe') `
      -ArgumentList @('/c', 'npm.cmd run dev:clean') `
      -WorkingDirectory $root | Out-Null
  }

  if (!(Wait-ForUrl $siteUrl $TimeoutSeconds)) {
    throw "Local site did not become ready within $TimeoutSeconds seconds: $siteUrl"
  }
  Write-Status 'Local site is ready on http://localhost:3000.'
}

if (Test-UrlReady $healthUrl) {
  Write-Status 'DB health API is responding.'
} else {
  Write-Status 'Warning: site is open, but DB health API did not respond yet.'
}

if ($OpenBrowser) {
  Write-Status "Opening $siteUrl"
  Start-Process $siteUrl | Out-Null
}
