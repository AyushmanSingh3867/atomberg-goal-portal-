@echo off
color 0B
echo ===================================================
echo     ATOMBERG GOAL SETTING PORTAL - DEMO LAUNCHER
echo ===================================================
echo.
echo Cleaning up any stuck background processes...
call npx kill-port 3000 5000 >nul 2>&1

echo.
echo Starting Database via Docker...
call docker-compose up -d

echo.
echo Starting Backend Server (Port 5000)...
start "Atomberg Backend" cmd /c "color 0A && cd backend && echo Starting Backend... && npm run dev"

echo Starting Frontend Server (Port 3000)...
start "Atomberg Frontend" cmd /c "color 0D && cd frontend && echo Clearing Next.js cache... && if exist .next rmdir /s /q .next && echo Starting Frontend... && npm run dev"

echo.
echo ===================================================
echo Servers are launching in separate windows!
echo Please wait about 10 seconds for them to boot up.
echo.
echo Your links:
echo Employee Page: http://localhost:3000/checkin
echo Manager Page:  http://localhost:3000/dashboard
echo ===================================================
echo.
pause
