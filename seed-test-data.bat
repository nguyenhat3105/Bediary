@echo off
chcp 65001 > nul
title Bediary - Seed Test Data

echo.
echo ==========================================
echo   BEDIARY - RESET AND SEED TEST DATA
echo ==========================================
echo.

where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo psql was not found in PATH.
    echo Please install PostgreSQL command line tools or run this SQL manually:
    echo bediary-backend\src\main\resources\bediary_test_seed.sql
    pause
    exit /b 1
)

set DB_NAME=bediary_db
set DB_USER=postgres

echo Database: %DB_NAME%
echo User:     %DB_USER%
echo.
echo You may be asked for the PostgreSQL password.
echo.

psql -U %DB_USER% -d %DB_NAME% -f "%~dp0bediary-backend\src\main\resources\bediary_test_seed.sql"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Seed failed. Check that PostgreSQL is running and the database exists.
    pause
    exit /b 1
)

echo.
echo Seed completed.
echo.
echo Test accounts:
echo   ADMIN:  parent@bediary.test  / password123
echo   VIEWER: grandma@bediary.test / password123
echo   Invite code: BEDIARY1
echo.
pause
