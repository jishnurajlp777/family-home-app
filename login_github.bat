@echo off
title GitHub Sign In for Family Home
echo ========================================================
echo   Connecting your GitHub Account...
echo ========================================================
echo.
echo A code will appear on this screen and your browser will open.
echo Enter the code in the browser window to authorize GitHub.
echo.
"C:\Program Files\GitHub CLI\gh.exe" auth login --web -p https
echo.
echo ========================================================
echo GitHub login finished! Press any key to close this window.
echo ========================================================
pause
