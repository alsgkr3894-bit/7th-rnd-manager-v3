[CmdletBinding()]
param(
  [switch]$ShowStatus,
  [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $scriptDir '..')).Path
$binDir = Join-Path $root '.postgresql\pgsql\bin'
$dataDir = Join-Path $root '.pgdata'
$logDir = Join-Path $root '.pglog'
$postgres = Join-Path $binDir 'postgres.exe'
$psql = Join-Path $binDir 'psql.exe'

function Write-Status {
  param([string]$Message)

  if ($ShowStatus) {
    Write-Host $Message
  }
}

function Test-DatabaseReady {
  if (!(Test-Path $psql)) {
    return $false
  }

  $previousTimeout = $env:PGCONNECT_TIMEOUT
  $previousErrorActionPreference = $ErrorActionPreference
  $env:PGCONNECT_TIMEOUT = '3'
  $ErrorActionPreference = 'SilentlyContinue'
  try {
    & $psql `
      -h '127.0.0.1' `
      -p '5432' `
      -U 'rnd_app' `
      -d 'rnd_manager' `
      -tAc 'select 1' *> $null

    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  } finally {
    $env:PGCONNECT_TIMEOUT = $previousTimeout
    $script:ErrorActionPreference = $previousErrorActionPreference
  }
}

if (!(Test-Path $postgres)) {
  throw "Portable PostgreSQL was not found: $postgres"
}

if (!(Test-Path $dataDir)) {
  throw "PostgreSQL data directory was not found: $dataDir"
}

if (Test-DatabaseReady) {
  Write-Status 'Local PostgreSQL is already running on 127.0.0.1:5432.'
  exit 0
}

$portOwner = Get-NetTCPConnection `
  -LocalAddress '127.0.0.1' `
  -LocalPort 5432 `
  -State Listen `
  -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($portOwner) {
  throw "Port 5432 is already in use by process $($portOwner.OwningProcess), but rnd_manager is not ready."
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stdoutLog = Join-Path $logDir 'postgres.out.log'
$stderrLog = Join-Path $logDir 'postgres.err.log'
$arguments = @('-D', $dataDir, '-h', '127.0.0.1', '-p', '5432')

Write-Status 'Starting local PostgreSQL in the background...'

$process = Start-Process `
  -FilePath $postgres `
  -ArgumentList $arguments `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
  if (Test-DatabaseReady) {
    Write-Status "Local PostgreSQL is ready. Process ID: $($process.Id)"
    exit 0
  }

  Start-Sleep -Seconds 1
}

throw "Local PostgreSQL did not become ready within $TimeoutSeconds seconds. Check $stderrLog"
