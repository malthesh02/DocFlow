@echo off
title DocFlow Launcher
echo ===================================================
echo               Starting DocFlow
echo ===================================================

echo [1/3] Starting Django Backend on port 8000...
start "DocFlow Backend (Django - Port 8000)" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe manage.py runserver 8000"

echo [2/3] Starting Angular Frontend on port 4200...
start "DocFlow Frontend (Angular - Port 4200)" cmd /k "cd /d "%~dp0frontend" && call npm start"

echo [3/3] Launching DocFlow in default browser...
ping 127.0.0.1 -n 6 >nul
start http://localhost:4200/

echo ===================================================
echo DocFlow is running!
echo Frontend: http://localhost:4200/
echo Backend:  http://127.0.0.1:8000/api/
echo ===================================================
