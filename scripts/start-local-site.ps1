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
$stdoutLog = Join-Path $root '.local-site.out.log'
$stderrLog = Join-Path $root '.local-site.err.log'
$node = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source

function Write-Status {
  param([string]$Message)

  if ($ShowStatus) {
    Write-Host $Message
  }
}

function Normalize-ProcessPathEnvironment {
  $environment = [Environment]::GetEnvironmentVariables('Process')
  $pathKeys = @($environment.Keys | Where-Object {
      [string]::Equals($_, 'Path', [StringComparison]::OrdinalIgnoreCase)
    })

  if ($pathKeys.Count -le 1) {
    return
  }

  $preferredKey = @($pathKeys | Where-Object { $_ -ceq 'Path' } | Select-Object -First 1)[0]
  if ([string]::IsNullOrWhiteSpace($preferredKey)) {
    $preferredKey = $pathKeys[0]
  }

  $pathValue = [string]$environment[$preferredKey]
  foreach ($pathKey in $pathKeys) {
    [Environment]::SetEnvironmentVariable($pathKey, $null, 'Process')
  }
  [Environment]::SetEnvironmentVariable('Path', $pathValue, 'Process')
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
    [int]$Seconds,
    [System.Diagnostics.Process]$Process = $null,
    [string]$ErrorLog = $null
  )

  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if ($Process -and $Process.HasExited) {
      $tail = ''
      if ($ErrorLog -and (Test-Path $ErrorLog)) {
        $tail = (Get-Content $ErrorLog -Tail 20 -ErrorAction SilentlyContinue) -join [Environment]::NewLine
      }
      throw "Local site process exited before readiness with code $($Process.ExitCode).$([Environment]::NewLine)$tail"
    }

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
  $siteProcess = $null
  $portOwner = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  if ($portOwner) {
    Write-Status "Port 3000 is already listening by process $($portOwner.OwningProcess). Waiting for the site..."
  } else {
    Write-Status 'Starting local site server on http://localhost:3000...'
    Normalize-ProcessPathEnvironment
    & $node 'scripts/prepare-dev.mjs' '--kill'
    if ($LASTEXITCODE -ne 0) {
      throw "Local site prepare-dev failed with exit code $LASTEXITCODE."
    }

    $siteProcess = Start-Process `
      -WindowStyle Hidden `
      -FilePath $node `
      -ArgumentList @('scripts/start-next-dev-server.mjs') `
      -WorkingDirectory $root `
      -RedirectStandardOutput $stdoutLog `
      -RedirectStandardError $stderrLog `
      -PassThru
  }

  if (!(Wait-ForUrl $siteUrl $TimeoutSeconds $siteProcess $stderrLog)) {
    throw "Local site did not become ready within $TimeoutSeconds seconds: $siteUrl"
  }

  Start-Sleep -Seconds 2
  if (!(Test-UrlReady $siteUrl)) {
    throw "Local site became ready but failed the follow-up health check: $siteUrl"
  }

  $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (!$listener) {
    throw 'Local site became ready but port 3000 is no longer listening.'
  }

  if ($siteProcess -and $siteProcess.HasExited) {
    throw "Local site process exited after readiness with code $($siteProcess.ExitCode)."
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
