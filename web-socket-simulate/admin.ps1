# Quiz Admin - Windows PowerShell Script
# Start the quiz admin terminal

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Quiz Admin Terminal" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if bun is installed (preferred)
if (Get-Command bun -ErrorAction SilentlyContinue) {
    Write-Host "Using Bun package manager..." -ForegroundColor Green
    bun run admin
} else {
    Write-Host "Using npm..." -ForegroundColor Green
    npm run admin
}

Write-Host ""
Read-Host "Press Enter to exit"
