@echo off
setlocal
title SecureShop - Sao luu du lieu
cd /d "%~dp0"
REM =====================================================================
REM  SAO LUU: database secureshop_ai + thu muc anh/file (backend\uploads)
REM  Ket qua nam trong thu muc backups\ :
REM     secureshop_ai_<ngay_gio>.sql   (toan bo bang + du lieu)
REM     uploads_<ngay_gio>.zip         (anh san pham, file chat)
REM  Khoi phuc: chay restore-database.bat
REM =====================================================================
set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DB=secureshop_ai"
REM XAMPP mac dinh user root khong co mat khau. Neu ban da dat mat khau, dien vao day:
set "DB_PASSWORD="
set "PASS_ARG="
if not "%DB_PASSWORD%"=="" set "PASS_ARG=-p%DB_PASSWORD%"

echo ============================================================
echo  SecureShop - SAO LUU DU LIEU (database %DB%)
echo ============================================================
echo.

if not exist "%MYSQL_BIN%\mysqldump.exe" (
  echo [LOI] Khong tim thay %MYSQL_BIN%\mysqldump.exe
  echo       Hay sua dong MYSQL_BIN trong file nay cho dung thu muc XAMPP cua ban.
  goto fail
)

netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if errorlevel 1 (
  echo [LOI] MySQL chua chay. Mo XAMPP Control Panel, bam Start o dong MySQL roi chay lai.
  goto fail
)

REM Lay ngay gio dang 20261117_153045 (khong phu thuoc dinh dang ngay cua Windows)
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
if "%TS%"=="" (
  echo [LOI] Khong lay duoc ngay gio tu PowerShell.
  goto fail
)

if not exist "backups" mkdir "backups"
set "SQL_FILE=backups\%DB%_%TS%.sql"

echo [1/2] Dang xuat database ra %SQL_FILE% ...
"%MYSQL_BIN%\mysqldump.exe" -h 127.0.0.1 -P 3306 -u root %PASS_ARG% --single-transaction --routines --triggers ^
  --default-character-set=utf8mb4 --add-drop-table "%DB%" > "%SQL_FILE%"
if errorlevel 1 (
  echo [LOI] mysqldump that bai. Kiem tra MySQL va ten database "%DB%".
  if exist "%SQL_FILE%" del "%SQL_FILE%"
  goto fail
)
for %%F in ("%SQL_FILE%") do echo       Xong: %%~nxF  (%%~zF bytes)
echo.

echo [2/2] Dang nen thu muc anh/file (backend\uploads) ...
if exist "backend\uploads" (
  REM Dung tar co san cua Windows 10/11 (khong phai tar cua Git) de tao file .zip
  "%SystemRoot%\System32\tar.exe" -a -c -f "backups\uploads_%TS%.zip" -C "backend" "uploads"
  if errorlevel 1 (
    echo       [CANH BAO] Khong nen duoc thu muc uploads. Database van da sao luu xong.
  ) else (
    for %%F in ("backups\uploads_%TS%.zip") do echo       Xong: %%~nxF  ^(%%~zF bytes^)
  )
) else (
  echo       Chua co thu muc backend\uploads - bo qua.
)
echo.
echo ============================================================
echo  SAO LUU THANH CONG. Cac file nam trong:
echo  %~dp0backups
echo  Nen chep thu muc nay sang USB / Google Drive de phong hong may.
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
pause
exit /b 1
