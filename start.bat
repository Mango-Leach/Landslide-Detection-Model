@echo off
echo.
echo ╔════════════════════════════════════════╗
echo ║       Starting IoT Dashboard           ║
echo ╚════════════════════════════════════════╝
echo.

echo [1/2] Starting Node.js Server...
start "IoT Dashboard Server" cmd /k "cd /d %~dp0 && node server-advanced.js"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Python Simulator...
start "Sensor Simulator" cmd /k "cd /d %~dp0 && python sensor_simulator.py"

timeout /t 2 /nobreak > nul

echo.
echo  Dashboard started successfully!
echo.
echo  Open browser: http://localhost:3000
echo  Login page: http://localhost:3000/login.html
echo  Admin panel: http://localhost:3000/admin.html
echo.
echo Press any key to open dashboard in browser...
pause > nul

start http://localhost:3000

echo.
echo  Browser opened!
echo.
echo To stop the dashboard, close both terminal windows.
echo.
pause