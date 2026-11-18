@echo off
title SecureShop - Chuyen sang MySQL cua XAMPP
REM =====================================================================
REM  May co cai them "MySQL Server 8.0" (dich vu MySQL80) tu chay cung Windows va chiem cong 3306.
REM  SecureShop dung MySQL (MariaDB) cua XAMPP -> phai tat MySQL80 truoc.
REM  File nay: tat MySQL80, (tuy chon) khong cho no tu chay nua, roi bat MySQL cua XAMPP.
REM  Du lieu cua MySQL80 KHONG bi xoa, muon dung lai thi bat lai dich vu MySQL80.
REM =====================================================================

net session >nul 2>&1
if errorlevel 1 (
  echo Can quyen Administrator. Windows se hoi, hay bam "Yes"...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo ============================================================
echo  CHUYEN SANG MySQL CUA XAMPP
echo ============================================================
echo.
sc query MySQL80 | findstr /C:"RUNNING" >nul
if errorlevel 1 (
  echo [1/3] Dich vu MySQL80 dang tat - bo qua.
) else (
  echo [1/3] Dang tat dich vu MySQL80...
  net stop MySQL80
)

echo.
echo [2/3] MySQL80 dang tu chay moi khi bat Windows.
choice /c YN /m "Tat che do tu chay cua MySQL80 (khuyen nghi neu ban chi dung XAMPP)"
if errorlevel 2 (
  echo       Giu nguyen. Lan sau bat may, nho chay lai file nay truoc khi dung SecureShop.
) else (
  sc config MySQL80 start= demand >nul
  echo       Da chuyen MySQL80 sang "Manual": tu nay khong tu chay nua.
)

echo.
echo [3/3] Bat MySQL cua XAMPP...
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if not errorlevel 1 (
  echo       [LOI] Cong 3306 van dang bi chuong trinh khac chiem. Mo XAMPP Control Panel de xem.
  goto end
)
start "SecureShop - MySQL (XAMPP)" /min "C:\xampp\mysql_start.bat"
set /a tries=0
:wait
timeout /t 1 /nobreak >nul
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if not errorlevel 1 goto ok
set /a tries+=1
if %tries% geq 30 (
  echo       [LOI] MySQL cua XAMPP khong bat duoc. Mo XAMPP Control Panel de xem loi.
  goto end
)
goto wait
:ok
echo       MySQL cua XAMPP da chay.
echo.
echo ============================================================
echo  XONG! Gio chay start-all.bat (hoac start-backend.bat).
echo ============================================================
:end
echo.
pause
