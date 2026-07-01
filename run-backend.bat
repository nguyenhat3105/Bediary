@echo off
chcp 65001 > nul
title Bediary - Backend Server

echo.
echo ╔════════════════════════════════════════╗
echo ║       🍼 BEDIARY BACKEND SERVER        ║
echo ║     Java 21 + Spring Boot 3.x         ║
echo ╚════════════════════════════════════════╝
echo.

:: Kiểm tra Maven
where mvn >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Maven chưa được cài đặt hoặc chưa có trong PATH
    echo    Tải tại: https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

echo ✅ Maven đã sẵn sàng
echo.

:: Hỏi mật khẩu PostgreSQL nếu không phải 'postgres'
set DB_PASSWORD=postgres
echo 💡 Mật khẩu PostgreSQL mặc định: postgres
echo    Nếu bạn đặt khác, hãy sửa file: bediary-backend\src\main\resources\application.yml
echo.
echo 🚀 Đang khởi động backend tại http://localhost:8080/api/v1 ...
echo    (Lần đầu chạy sẽ tải dependencies ~2-3 phút)
echo.

cd /d "%~dp0bediary-backend"
mvn spring-boot:run

pause
