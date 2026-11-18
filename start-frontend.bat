@echo off
title SecureShop - Frontend (Vite, cong 5173)
cd /d "%~dp0frontend"
set "SCHEME=http"
if "%HTTPS%"=="1" set "SCHEME=https"
echo ============================================================
echo  SecureShop FRONTEND - React + Vite, cong 5173 (%SCHEME%)
echo  - May nay mo:        %SCHEME%://localhost:5173
echo  - May khac cung WiFi: %SCHEME%://^<IP Wi-Fi cua may nay^>:5173
if not "%HTTPS%"=="1" echo  - Goi video giua 2 may can HTTPS: dung start-demo-2-may.bat
echo  - Dong cua so nay = tat frontend.
echo ============================================================
echo.
if not exist node_modules (
  echo Lan dau chay: dang cai thu vien...
  call npm install
)
call npm run dev
echo.
echo Frontend da dung. Nhan phim bat ky de dong cua so...
pause >nul
