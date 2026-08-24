@echo off
chcp 65001 >nul
title Cockroach Life — TOP-DOWN (local 127.0.0.1)
cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git not found. Install Git for Windows, then run again.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install LTS from https://nodejs.org
  pause
  exit /b 1
)

echo.
echo === Pull latest TOP-DOWN main ===
git fetch origin
git checkout main
git pull origin main
if errorlevel 1 (
  echo [ERROR] git pull failed
  pause
  exit /b 1
)

echo.
echo Latest commit:
git log -1 --oneline

echo.
echo === npm install ===
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed
  pause
  exit /b 1
)

echo.
echo === Start local game ===
echo Open: http://127.0.0.1:5173/
echo In menu bottom-left you MUST see: TOP-DOWN NEST
echo If you still see sofa/Roads — this is the WRONG folder.
echo.
call npx vite --host 127.0.0.1 --port 5173 --force
pause
