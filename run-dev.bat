@echo off
title Tennis App Local Launcher
echo ===================================================
echo   Tennis App Local Launcher
echo ===================================================
echo.

echo 1. Starting Astro frontend server (Port 4321)...
start "Astro Frontend Server" cmd /k "npm run dev -- --port 4321"

echo 2. Waiting for frontend to initialize (3 seconds)...
ping 127.0.0.1 -n 4 >nul

echo 3. Opening browser at http://localhost:8888 ...
start http://localhost:8888

echo 4. Starting backend proxy server (Port 8888)...
echo ---------------------------------------------------
node dev-server.js

pause
