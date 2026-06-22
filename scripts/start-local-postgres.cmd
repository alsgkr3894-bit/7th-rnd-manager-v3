@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local-postgres.ps1" -ShowStatus
set "exitCode=%ERRORLEVEL%"

echo.
if "%exitCode%"=="0" (
  echo Local PostgreSQL startup check completed.
) else (
  echo Local PostgreSQL startup failed with exit code %exitCode%.
)

pause
exit /b %exitCode%
