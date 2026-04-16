@echo off
setlocal
cd /d %~dp0

REM ??? ?? ??
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo ??? ???? ?? ?????...
  powershell -NoProfile -Command "Start-Process -Verb RunAs cmd -ArgumentList '/k cd /d \"%~dp0\" ^&^& npm run dev'"
  exit /b
)

echo ?? 3000 ?? ???? ??...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul

echo ?? ?? ??...
call npm run dev
