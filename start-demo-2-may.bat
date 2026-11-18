@echo off
setlocal
title SecureShop - DEMO 2 LAPTOP (goi video)
cd /d "%~dp0"
REM =====================================================================
REM  Chay tren LAPTOP 1 (may chu). LAPTOP 2 chi can mo trinh duyet.
REM  Khac start-all.bat o cho: frontend chay HTTPS (bat buoc de laptop 2 dung duoc camera/micro)
REM  va link trong email tro ve dia chi IP cua may nay.
REM =====================================================================
echo ============================================================
echo  SecureShop - DEMO GOI VIDEO GIUA 2 LAPTOP
echo ============================================================
echo.

REM ---- 1. Neu backend/frontend dang chay (start-all.bat) thi phai tat truoc ----
netstat -ano | findstr /R /C:":8081 .*LISTENING" >nul
if not errorlevel 1 goto running
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if not errorlevel 1 goto running

REM ---- 2. Tim dia chi IP trong mang LAN: card mang THAT (WiFi/LAN) co default gateway, bo qua card ao (VPN, VirtualBox) ----
set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$all = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' }; $c = $all | Where-Object { $_.NetAdapter.HardwareInterface } | Select-Object -First 1; if (-not $c) { $c = $all | Select-Object -First 1 }; if ($c) { $c.IPv4Address[0].IPAddress }"`) do set "LAN_IP=%%i"
if "%LAN_IP%"=="" (
  echo [CANH BAO] Khong tim thay IP mang LAN. May nay da ket noi WiFi chua?
  echo            Van tiep tuc, nhung laptop 2 se khong vao duoc.
  set "LAN_IP=localhost"
)
echo  IP cua may nay trong mang LAN: %LAN_IP%
echo.

REM ---- 3. MySQL ----
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
if not errorlevel 1 goto mysqlok
if not exist "C:\xampp\mysql_start.bat" (
  echo       Khong tim thay C:\xampp\mysql_start.bat - hay bat MySQL trong XAMPP Control Panel roi chay lai.
  pause
  exit /b 1
)
start "SecureShop - MySQL (XAMPP)" /min "C:\xampp\mysql_start.bat"
set /a tries=0
:waitmysql
timeout /t 1 /nobreak >nul
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if not errorlevel 1 goto mysqlok
set /a tries+=1
if %tries% geq 30 (
  echo       MySQL khong khoi dong duoc. Mo XAMPP Control Panel de xem loi.
  pause
  exit /b 1
)
goto waitmysql
:mysqlok
echo       MySQL san sang.

REM ---- 4. Backend: link trong email tro ve https://IP:5173 ----
echo [2/3] Mo backend (cong 8081)...
set "FRONTEND_URL=https://%LAN_IP%:5173"
start "" "%~dp0start-ai.bat"
start "" "%~dp0start-backend.bat"

REM ---- 5. Frontend HTTPS ----
echo [3/3] Mo frontend HTTPS (cong 5173)...
set "HTTPS=1"
start "" "%~dp0start-frontend.bat"

echo.
echo Dang cho backend khoi dong (20-40 giay)...
set /a tries=0
:waitbackend
timeout /t 2 /nobreak >nul
netstat -ano | findstr /R /C:":8081 .*LISTENING" >nul
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% geq 60 goto ready
goto waitbackend
:ready
start "" https://localhost:5173

echo.
echo ============================================================
echo  XONG! HUONG DAN DEMO
echo ------------------------------------------------------------
echo  LAPTOP 1 (may nay)  : https://localhost:5173
echo                        dang nhap tai khoan ADMIN, vao "Hop thu tu van"
echo  LAPTOP 2 (khach)    : https://%LAN_IP%:5173
echo                        (2 may phai cung 1 mang WiFi)
echo ------------------------------------------------------------
echo  Lan dau mo, trinh duyet bao "Ket noi khong rieng tu":
echo    bam "Nang cao" -^> "Tiep tuc truy cap %LAN_IP% (khong an toan)".
echo    Day la chung chi tu tao de chay HTTPS trong mang noi bo, khong sao.
echo  Windows hoi cho Node.js truy cap mang: chon "Mang rieng" -^> Cho phep.
echo  Khi goi video, trinh duyet hoi quyen camera/micro: bam "Cho phep".
echo ============================================================
echo.
pause
exit /b 0

:running
echo [!] Backend hoac frontend dang chay (cua so start-all.bat).
echo     Hay DONG cac cua so "SecureShop - Backend" va "SecureShop - Frontend"
echo     roi chay lai file nay (frontend can khoi dong lai o che do HTTPS).
echo.
pause
exit /b 1
