@echo off
setlocal EnableDelayedExpansion
title SecureShop - Khoi phuc du lieu
cd /d "%~dp0"
REM =====================================================================
REM  KHOI PHUC database secureshop_ai tu 1 file trong thu muc backups\
REM  CANH BAO: du lieu hien tai se bi THAY THE bang du lieu trong file sao luu.
REM  Truoc khi khoi phuc, file nay tu sao luu trang thai hien tai (before_restore_...).
REM =====================================================================
set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DB=secureshop_ai"
set "DB_PASSWORD="
set "PASS_ARG="
if not "%DB_PASSWORD%"=="" set "PASS_ARG=-p%DB_PASSWORD%"

echo ============================================================
echo  SecureShop - KHOI PHUC DU LIEU (database %DB%)
echo ============================================================
echo.

if not exist "%MYSQL_BIN%\mysql.exe" (
  echo [LOI] Khong tim thay %MYSQL_BIN%\mysql.exe
  goto fail
)
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if errorlevel 1 (
  echo [LOI] MySQL chua chay. Mo XAMPP Control Panel, bam Start o dong MySQL roi chay lai.
  goto fail
)
if not exist "backups\%DB%_*.sql" (
  echo [LOI] Chua co file sao luu nao trong thu muc backups\
  echo       Hay chay backup-database.bat truoc.
  goto fail
)

echo Cac file sao luu (moi nhat o cuoi):
set "LATEST="
for /f "delims=" %%F in ('dir /b /o:n "backups\%DB%_*.sql"') do (
  echo    %%F
  set "LATEST=%%F"
)
echo.
set "CHOSEN="
set /p "CHOSEN=Nhap ten file muon khoi phuc (Enter = file moi nhat !LATEST!): "
if "!CHOSEN!"=="" set "CHOSEN=!LATEST!"
if not exist "backups\!CHOSEN!" (
  echo [LOI] Khong tim thay backups\!CHOSEN!
  goto fail
)

netstat -ano | findstr /R /C:":8081 .*LISTENING" >nul
if not errorlevel 1 (
  echo.
  echo [CHU Y] Backend dang chay. Nen DONG cua so backend truoc, khoi phuc xong moi bat lai.
)

echo.
echo Se THAY THE toan bo du lieu cua "%DB%" bang file: !CHOSEN!
choice /c YN /m "Ban chac chan muon khoi phuc"
if errorlevel 2 (
  echo Da huy, khong thay doi gi.
  goto end
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
echo.
echo [1/3] Sao luu du phong trang thai hien tai -^> backups\before_restore_!TS!.sql
"%MYSQL_BIN%\mysqldump.exe" -h 127.0.0.1 -P 3306 -u root %PASS_ARG% --single-transaction --routines --triggers ^
  --default-character-set=utf8mb4 --add-drop-table "%DB%" > "backups\before_restore_!TS!.sql" 2>nul
if errorlevel 1 (
  echo       [CANH BAO] Khong sao luu du phong duoc ^(co the database chua ton tai^). Tiep tuc khoi phuc.
  del "backups\before_restore_!TS!.sql" 2>nul
)

echo [2/3] Tao lai database %DB% ...
"%MYSQL_BIN%\mysql.exe" -h 127.0.0.1 -P 3306 -u root %PASS_ARG% -e "DROP DATABASE IF EXISTS `%DB%`; CREATE DATABASE `%DB%` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if errorlevel 1 (
  echo [LOI] Khong tao lai duoc database.
  goto fail
)

echo [3/3] Nap du lieu tu !CHOSEN! ...
"%MYSQL_BIN%\mysql.exe" -h 127.0.0.1 -P 3306 -u root %PASS_ARG% --default-character-set=utf8mb4 "%DB%" < "backups\!CHOSEN!"
if errorlevel 1 (
  echo [LOI] Nap du lieu that bai. Ban co the khoi phuc lai trang thai cu bang file before_restore_!TS!.sql
  goto fail
)

REM Anh/file di kem (cung ngay gio voi file .sql)
set "STAMP=!CHOSEN:%DB%_=!"
set "STAMP=!STAMP:.sql=!"
if exist "backups\uploads_!STAMP!.zip" (
  echo.
  choice /c YN /m "Khoi phuc ca anh/file (backups\uploads_!STAMP!.zip) vao backend\uploads"
  if not errorlevel 2 (
    "%SystemRoot%\System32\tar.exe" -x -f "backups\uploads_!STAMP!.zip" -C "backend"
    if errorlevel 1 (echo       [CANH BAO] Giai nen anh/file that bai.) else (echo       Da khoi phuc anh/file.)
  )
)

echo.
echo ============================================================
echo  KHOI PHUC THANH CONG. Hay khoi dong lai backend (start-backend.bat).
echo ============================================================
goto end

:fail
echo.
pause
exit /b 1

:end
echo.
pause
exit /b 0
