@echo off
rem ---------------------------------------------------------------------
rem Launcher only. All logic and messages live in tools\dev.ps1.
rem Keep this file ASCII-only: cmd.exe cannot parse non-ASCII batch files
rem reliably.
rem ---------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\dev.ps1"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
    echo.
    pause
)
exit /b %RESULT%
