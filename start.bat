@echo off
echo Starting Roundone...
echo.

:: Start the backend in a new window
start "Roundone Backend" cmd /k "cd /d C:\ESSEX\projects\Roundone && python -m uvicorn backend.main:app --reload"

:: Wait 3 seconds for backend to boot
timeout /t 3 /nobreak >nul

:: Start the frontend in a new window
start "Roundone Frontend" cmd /k "cd /d C:\ESSEX\projects\Roundone\frontend && npm run dev"

:: Wait 4 seconds then open the browser
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo Both servers are running.
echo Backend  : http://localhost:8000
echo Frontend : http://localhost:5173
echo.
echo Close the two black windows to stop the servers.
