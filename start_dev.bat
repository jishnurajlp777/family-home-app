@echo off
title Family Home Dev Environment (React + TS + MySQL)
echo ========================================================
echo   Starting Family Home Dev (React + TS + Node.js + MySQL)
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your PATH!
    pause
    exit /b
)

echo [1/2] Starting Node.js API Backend (Port 3000)...
start "Family API Backend (MySQL)" cmd /k "node server/server.js"

echo [2/2] Starting Vite Frontend Server (Port 5173)...
start "" http://localhost:5173
npm run dev
