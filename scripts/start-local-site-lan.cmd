@echo off
setlocal

echo Starting the site for LAN access (other office PCs can connect)...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local-site.ps1" -Lan -OpenBrowser -ShowStatus
set "exitCode=%ERRORLEVEL%"

echo.
if "%exitCode%"=="0" (
  echo Local site startup check completed. Other PCs on the same LAN can connect using this PC's IP address, e.g. http://192.168.x.x:3000
) else (
  echo Local site startup failed with exit code %exitCode%.
)

pause
exit /b %exitCode%
