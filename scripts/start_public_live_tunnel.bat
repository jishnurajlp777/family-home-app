@echo off
cd /d "%~dp0\.."
title Family Home - Free Live Public Internet Tunnel
echo ========================================================
echo   Generating Free Worldwide Public URL for Family Home
echo ========================================================
echo.
echo Connecting to free secure tunnel on port 3000...
echo.
call npx --yes localtunnel --port 3000
pause
