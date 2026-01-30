
@echo off
cd /d %~dp0
echo Downloading gradle-wrapper.jar...
curl -L -o "gradle\wrapper\gradle-wrapper.jar" "https://raw.githubusercontent.com/nicheware/gradle-wrapper-jar/gradle-8.0/gradle/wrapper/gradle-wrapper.jar"
echo Done! Checking file size:
dir "gradle\wrapper\gradle-wrapper.jar"
pause
