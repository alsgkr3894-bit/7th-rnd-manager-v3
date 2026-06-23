@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local-site.ps1" -OpenBrowser -ShowStatus
set "exitCode=%ERRORLEVEL%"

echo.
if "%exitCode%"=="0" (
  echo Local site startup check completed.
) else (
  echo Local site startup failed with exit code %exitCode%.
)

pause
exit /b %exitCode%
