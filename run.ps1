# DocFlow PowerShell Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "              Starting DocFlow" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$rootDir = $PSScriptRoot

Write-Host "[1/3] Starting Django Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; .\venv\Scripts\python.exe manage.py runserver 8000"

Write-Host "[2/3] Starting Angular Frontend on port 4200..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm start"

Write-Host "[3/3] Launching DocFlow in default browser..." -ForegroundColor Green
Start-Sleep -Seconds 6
Start-Process "http://localhost:4200/"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "DocFlow is running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200/" -ForegroundColor White
Write-Host "Backend:  http://127.0.0.1:8000/api/" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan
