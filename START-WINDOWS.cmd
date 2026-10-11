@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.9 or newer from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)
echo Opening Sleeve at http://127.0.0.1:3000
echo Album search needs a real contact in .env. See README.md.
start "" http://127.0.0.1:3000
node --env-file-if-exists=.env server.mjs
pause
