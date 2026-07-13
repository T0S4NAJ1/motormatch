@echo off
echo =====================================
echo  Chrome DevTools Mode
echo =====================================
echo.
echo Menutup semua Chrome...
taskkill /f /im chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo.
echo Membuka Chrome dengan Debug Mode...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
echo.
echo =====================================
echo  Chrome DevTools AKTIF!
echo  Port: 9222
echo =====================================
echo.
pause
