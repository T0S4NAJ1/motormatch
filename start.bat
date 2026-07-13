@echo off
cd /d "%~dp0"
npm install
npm run fixdb
npm run dev
pause
