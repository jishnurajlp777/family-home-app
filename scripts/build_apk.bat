@echo off
cd /d "%~dp0\.."
echo ===================================================
echo   Family Home App - Android APK Build Pipeline
echo ===================================================
echo.

echo [1/3] Building Web Production Assets (Vite)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Web build failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Syncing Web Assets to Android Project (Capacitor)...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Capacitor sync failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Compiling Android APK with Gradle...
cd android
if exist gradlew.bat (
    call gradlew.bat assembleDebug
    if %ERRORLEVEL% equ 0 (
        echo.
        echo ===================================================
        echo   BUILD SUCCESSFUL!
        echo   APK Location:
        echo   android\app\build\outputs\apk\debug\app-debug.apk
        echo ===================================================
    ) else (
        echo.
        echo [NOTICE] If Gradle failed with "SDK location not found",
        echo open the 'android' folder in Android Studio once or set ANDROID_HOME.
    )
) else (
    echo [ERROR] gradlew.bat not found in android directory!
)
cd ..
pause
