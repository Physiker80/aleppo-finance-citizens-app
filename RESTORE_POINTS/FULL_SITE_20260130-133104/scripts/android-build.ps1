Param(
  [string]$Task = "assembleDebug",
  [switch]$CleanGradleCaches
)

$ErrorActionPreference = "Stop"

# Configure Java 21 for this session
$javaHome = "C:\Users\sedki\.jdk\jdk-21.0.8"
if (-Not (Test-Path $javaHome)) {
  Write-Error "Java 21 JDK not found at $javaHome. Update the path in scripts\android-build.ps1."
}
$env:JAVA_HOME = $javaHome
$env:Path = "$($javaHome)\bin;" + $env:Path

# Ensure ASCII-path junction exists
$junction = "E:\finance_app"
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-Not (Test-Path $junction)) {
  cmd /c mklink /J "$junction" "$projectRoot" | Out-Null
}

$androidDir = Join-Path $junction "android"
if (-Not (Test-Path $androidDir)) {
  Write-Error "Android directory not found at $androidDir"
}

Push-Location $androidDir
try {
  if ($CleanGradleCaches) {
    Write-Host "Stopping Gradle daemons and clearing user caches..." -ForegroundColor Yellow
    .\gradlew.bat --stop | Out-Host
    Pop-Location
    Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle" -ErrorAction SilentlyContinue
    Push-Location $androidDir
  }

  Write-Host "Gradle version info:" -ForegroundColor Cyan
  .\gradlew.bat -v | Out-Host

  Write-Host "Running task: $Task" -ForegroundColor Cyan
  .\gradlew.bat $Task | Out-Host

  Write-Host "Done. Outputs are under android\app\build\outputs." -ForegroundColor Green
}
finally {
  Pop-Location
}
