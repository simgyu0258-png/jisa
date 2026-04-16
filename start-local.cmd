@echo off
cd /d %~dp0

echo [1/2] Building app...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo [2/2] Starting server at http://127.0.0.1:3000 ...
call npm run start:local
