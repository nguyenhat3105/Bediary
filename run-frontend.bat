@echo off
chcp 65001 > nul
title Bediary - Frontend (React + Vite)

echo.
echo ╔════════════════════════════════════════╗
echo ║      🎨 BEDIARY FRONTEND SERVER        ║
echo ║       ReactJS + Vite + Tailwind       ║
echo ╚════════════════════════════════════════╝
echo.

:: Kiểm tra Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js chưa được cài đặt
    echo    Tải tại: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js đã sẵn sàng
echo.

cd /d "%~dp0bediary-frontend"

:: Kiểm tra node_modules
if not exist "node_modules" (
    echo 📦 Chưa có node_modules - đang cài dependencies...
    npm install
    echo.
)

echo 🚀 Đang khởi động frontend tại http://localhost:5173 ...
echo.
npm run dev

pause
