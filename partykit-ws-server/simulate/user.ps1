# Quiz User - Windows PowerShell Script
# Start a quiz user terminal

# Check for required arguments
if ($args.Count -lt 2) {
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "Quiz User Terminal" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "ERROR: Activity key and nickname are required!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage: .\user.ps1 `<activity-key`> `<nickname`> [user-id]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\user.ps1 quiz-a1b2c3d4 Alice" -ForegroundColor Cyan
    Write-Host "  .\user.ps1 quiz-a1b2c3d4 Bob user-123" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: Run the admin first to get the activity key" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$activityKey = $args[0]
$nickname = $args[1]
$userId = if ($args.Count -gt 2) { $args[2] } else { "" }

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Quiz User Terminal" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Activity Key: $activityKey" -ForegroundColor Cyan
Write-Host "Nickname: $nickname" -ForegroundColor Cyan
Write-Host "User ID: $userId (auto-generated if not provided)" -ForegroundColor Cyan
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
    if ($userId) {
        bun run user $activityKey $nickname $userId
    } else {
        bun run user $activityKey $nickname
    }
} else {
    Write-Host "Using npm..." -ForegroundColor Green
    if ($userId) {
        npm run user $activityKey $nickname $userId
    } else {
        npm run user $activityKey $nickname
    }
}

Write-Host ""
Read-Host "Press Enter to exit"
