@echo off
REM Quiz Admin - Windows Batch Script
REM Start the quiz admin terminal

echo ======================================================================
echo Quiz Admin Terminal
echo ======================================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if bun is installed (preferred)
where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using Bun package manager...
    bun run admin
) else (
    echo Using npm...
    npm run admin
)

pause
