@echo off
rem ---------------------------------------------------------------------
rem Launcher only. All logic and messages live in tools\github-push.ps1.
rem cmd.exe cannot parse non-ASCII batch files reliably, so this file is
rem kept ASCII-only on purpose. Do not add Japanese text here.
rem ---------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\github-push.ps1" %*
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
