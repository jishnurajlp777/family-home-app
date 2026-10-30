@echo off
title Family Home Interface Server (SQLite DB)
echo ========================================================
echo   Starting Family Home Interface (SQLite Backend)
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your PATH!
    echo Please ensure Node.js is installed.
    pause
    exit /b
)

echo Starting SQLite Backend on http://localhost:3000 ...
start "" http://localhost:3000
if exist server\server.js (
    node server\server.js
) else (
    node server.js
)
pause
