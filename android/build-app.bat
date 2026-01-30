@echo off
setlocal
chcp 65001 > nul

:: Set Java Home
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot"

:: Define Safe Path
set "SAFE_PATH=E:\SafeProject"
set "ORIGINAL_PATH=E:\Syrian_Project\نظام استعلامات وشكاوي 1"

:: Create Junction if not exists (to avoid Arabic path issues)
if not exist "%SAFE_PATH%" (
    echo Creating safe junction link...
    mklink /J "%SAFE_PATH%" "%ORIGINAL_PATH%"
)

:: Run Build from Safe Path
echo Running Gradle Build from safe path...
cd /d "%SAFE_PATH%\android"
call gradlew.bat assembleDebug

if %ERRORLEVEL% equ 0 (
    echo.
    echo BUILD SUCCESSFUL!
    echo APK located at: %SAFE_PATH%\android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo.
    echo BUILD FAILED!
)

pause
