@echo off
echo ============================================
echo   DS_mini System Launcher
echo ============================================
echo.
echo Starting Frontend (Port 3000)...
start "Frontend" cmd /k "cd /d C:\vs code\DS_mini\frontend && npm run dev -- --port 3000"
timeout /t 3 /nobreak >nul
echo Starting Judge Server (Port 3001)...
start "JudgeServer" cmd /k "cd /d C:\vs code\DS_mini\judge-server && node src/server.js"
echo.
echo ============================================
echo   Servers Starting...
echo   Frontend: http://localhost:3000
echo   Judge:    http://localhost:3001
echo ============================================
echo.
echo Press any key to exit...
pause >nul