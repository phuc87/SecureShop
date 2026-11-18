@echo off
title SecureShop - Khoi dong tat ca
cd /d "%~dp0"
echo ============================================================
echo  SecureShop - KHOI DONG TAT CA
echo  Se mo 4 cua so: MySQL, Tro ly AI, Backend, Frontend. DUNG DONG chung.
echo ============================================================
echo.

sc query MySQL80 2>nul | findstr /C:"RUNNING" >nul
if not errorlevel 1 (
  echo.
  echo [LOI] Dich vu "MySQL80" ^(MySQL Server 8.0^) dang chay va chiem cong 3306.
  echo       SecureShop can MySQL cua XAMPP. Hay bam dup file: dung-mysql80-bat-xampp.bat
  echo       ^(bam Yes khi Windows hoi^), xong chay lai file nay.
  echo.
  pause
  exit /b 1
)
echo [1/3] Kiem tra MySQL (XAMPP, cong 3306)...
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if not errorlevel 1 (
  echo       MySQL da chay san.
  goto mysqlok
)
if not exist "C:\xampp\mysql_start.bat" (
  echo       Khong tim thay C:\xampp\mysql_start.bat
  echo       Hay mo XAMPP Control Panel va bam Start o dong MySQL, roi chay lai file nay.
  pause
  exit /b 1
)
echo       MySQL chua chay, dang bat...
start "SecureShop - MySQL (XAMPP)" /min "C:\xampp\mysql_start.bat"
set /a tries=0
:waitmysql
timeout /t 1 /nobreak >nul
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if not errorlevel 1 goto mysqlok
set /a tries+=1
if %tries% geq 30 (
  echo       MySQL khong khoi dong duoc sau 30 giay. Hay mo XAMPP Control Panel de xem loi.
  pause
  exit /b 1
)
goto waitmysql
:mysqlok
echo       MySQL san sang.
echo.

echo [2/3] Mo tro ly AI (Python, cong 8000) va backend (Spring Boot, cong 8081)...
start "" "%~dp0start-ai.bat"
start "" "%~dp0start-backend.bat"
echo.

echo [3/3] Mo frontend (Vite, cong 5173)...
start "" "%~dp0start-frontend.bat"
echo.

echo Dang cho backend khoi dong (khoang 20-30 giay)...
set /a tries=0
:waitbackend
timeout /t 2 /nobreak >nul
netstat -ano | findstr /R /C:":8081 .*LISTENING" >nul
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% geq 60 goto ready
goto waitbackend
:ready
echo.
echo Xong! Dang mo http://localhost:5173 ...
start "" http://localhost:5173
timeout /t 5 /nobreak >nul
