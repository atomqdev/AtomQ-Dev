@echo off
REM Quiz User - Windows Batch Script
REM Start a quiz user terminal
REM Usage: user.bat <activity-key> <nickname> [user-id]

if "%~1"=="" (
    echo ======================================================================
    echo Quiz User Terminal
    echo ======================================================================
    echo.
    echo ERROR: Activity key is required!
    echo.
    echo Usage: user.bat ^<activity-key^> ^<nickname^> [user-id]
    echo.
    echo Examples:
    echo   user.bat quiz-a1b2c3d4 Alice
    echo   user.bat quiz-a1b2c3d4 Bob user-123
    echo.
    echo Note: Run the admin first to get the activity key
    echo.
    pause
    exit /b 1
)

if "%~2"=="" (
    echo ERROR: Nickname is required!
    echo Usage: user.bat ^<activity-key^> ^<nickname^> [user-id]
    pause
    exit /b 1
)

echo ======================================================================
echo Quiz User Terminal
echo ======================================================================
echo.
echo Activity Key: %~1
echo Nickname: %~2
echo User ID: %~3 (auto-generated if not provided)
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
    bun run user %~1 %~2 %~3
) else (
    echo Using npm...
    npm run user %~1 %~2 %~3
)

pause
