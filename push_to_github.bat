@echo off
title Push Changes to GitHub
echo ========================================================
echo   Pushing Family Home Updates to GitHub...
echo ========================================================
echo.

git push origin main
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   PUSH SUCCESSFUL!
    echo   Repository: https://github.com/jishnurajlp777/family-home-app
    echo ========================================================
) else (
    echo.
    echo [NOTICE] If git push asked for login or rejected:
    echo 1. Run login_github.bat first to authorize GitHub.
    echo 2. Then run this script again.
)
echo.
pause
