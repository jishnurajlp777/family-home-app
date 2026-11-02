@echo off
cd /d "%~dp0\.."
title Family Home Interface Server (Node.js + MySQL / Cache)
echo ========================================================
echo   Starting Family Home Backend Server
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your PATH!
    echo Please ensure Node.js is installed.
    pause
    exit /b
)

echo Starting Backend on http://localhost:3000 ...
start "" http://localhost:3000/api/health
node server\server.js
pause
