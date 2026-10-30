@echo off
title Firebase Sign In for Family Home Live Cloud DB
echo ========================================================
echo   Connecting your Google / Firebase Account...
echo ========================================================
echo.
echo A browser window will open to sign in with your Google account.
echo.
call npx firebase login
echo.
echo ========================================================
echo Firebase login finished! Press any key to close this window.
echo ========================================================
pause
