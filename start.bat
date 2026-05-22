@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Novel Forge - BiLing

echo.
echo   ========================================
echo       Novel Forge - BiLing
echo   ========================================
echo.

start "" http://localhost:3000
npm run dev

pause
