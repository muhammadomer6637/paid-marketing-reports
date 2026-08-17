@echo off
cd /d "%~dp0"
echo Starting Paid Marketing Report...
start "Paid Marketing Report - close this window to stop" cmd /k "npm start"
timeout /t 3 /nobreak >nul
start "" http://localhost:4100
