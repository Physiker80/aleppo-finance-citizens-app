# Android build (Windows, Java 21)

This guide explains how to build APKs locally for the Android project in `android/` using Java 21.

## Prerequisites
- Java 21 JDK installed (we use `C:\Users\sedki\.jdk\jdk-21.0.8`).
- Android SDK installed; `android/local.properties` points to the SDK:
  - `sdk.dir=C:\\Users\\sedki\\AppData\\Local\\Android\\Sdk`
  - Ensure these SDK components are installed via Android SDK Manager:
    - Android SDK Platform 35
    - Android SDK Build-Tools 35.x
    - Android Platform-Tools
    - Android SDK Command-line Tools (latest)
- Gradle wrapper + AGP are already configured:
  - Gradle 8.11.1
  - Android Gradle Plugin 8.7.2
  - compileSdk/targetSdk 35
  - Java 21 `compileOptions` are enabled

## Important: ASCII path workaround
If your repository path contains non-ASCII characters (e.g., Arabic), some Java tools fail on Windows paths.
Create an ASCII-path junction once, then use it for Gradle commands:

```powershell
cmd /c mklink /J "E:\finance_app" "E:\Syrian_Project\نظام استعلامات وشكاوي نسخة"
```

Use `E:\finance_app\android` as the working directory for builds.

## Quick build with Java 21 (per-session)
Use these commands in PowerShell for a one-off build without changing system-wide settings:

```powershell
# Set Java 21 for this session
$env:JAVA_HOME = "C:\Users\sedki\.jdk\jdk-21.0.8"
$env:Path = "C:\Users\sedki\.jdk\jdk-21.0.8\bin;" + $env:Path

# Work from ASCII-path junction
Push-Location E:\finance_app\android

# Confirm Java/Gradle/AGP versions
./gradlew.bat -v

# Build debug APK
./gradlew.bat assembleDebug

# Outputs:
# android\app\build\outputs\apk\debug\app-debug.apk

# Build release APK (unsigned by default)
# ./gradlew.bat assembleRelease
# android\app\build\outputs\apk\release\app-release-unsigned.apk

Pop-Location
```

## Helper script
A helper script is available at `scripts/android-build.ps1`.

Examples:
```powershell
# Build debug APK
powershell -ExecutionPolicy Bypass -File scripts\android-build.ps1 -Task assembleDebug

# Build release APK and clean Gradle caches (if issues)
powershell -ExecutionPolicy Bypass -File scripts\android-build.ps1 -Task assembleRelease -CleanGradleCaches
```

## Capacitor sync (optional)
If you changed web assets or Capacitor plugins, sync before building:

```powershell
# From repo root
npm run build
npx cap sync android
```

## Signing release APK
To produce a signed release APK or AAB:
1. Create a keystore:
   ```powershell
   keytool -genkeypair -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias myalias
   ```
2. Configure signing in `android/app/build.gradle` or via `~/.gradle/gradle.properties`:
   - Example `gradle.properties` entries:
     ```
     MY_KEYSTORE=C:\\path\\to\\my-release-key.jks
     MY_KEY_ALIAS=myalias
     MY_KEYSTORE_PASSWORD=******
     MY_KEY_PASSWORD=******
     ```
   - Reference them in `android { buildTypes { release { signingConfig signingConfigs.release } } }`.
3. Build:
   ```powershell
   Push-Location E:\finance_app\android
   ./gradlew.bat assembleRelease
   Pop-Location
   ```

## Troubleshooting
- Cache lock or corrupted metadata:
  ```powershell
  Push-Location E:\finance_app\android
  ./gradlew.bat --stop
  Pop-Location
  Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle" -ErrorAction SilentlyContinue
  ```
- Unicode path issues: Always run Gradle from `E:\finance_app\android` (ASCII-path junction).
- SDK path errors: Update `android/local.properties` with a valid `sdk.dir`:
  ```
  sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
  ```
- Missing build-tools/platforms: Install via Android SDK Manager.

## Notes
- Do not commit `android/local.properties` (it is machine-specific).
- Java 21 is required; ensure the session or user environment variable points to the 21 JDK.
