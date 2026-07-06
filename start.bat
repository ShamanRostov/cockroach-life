@echo off
chcp 65001 >nul
title Cockroach Life — запуск
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ОШИБКА] Node.js не установлен.
  echo Скачайте с https://nodejs.org и установите LTS, затем запустите снова.
  echo.
  pause
  exit /b 1
)

echo.
echo === Жизнь таракана ===
echo Установка зависимостей...
call npm install
if errorlevel 1 (
  echo [ОШИБКА] npm install не удался
  pause
  exit /b 1
)

echo.
echo Запуск dev-сервера...
echo Откройте в браузере: http://localhost:5173
echo Закройте это окно чтобы остановить сервер.
echo.
call npm run dev
pause
