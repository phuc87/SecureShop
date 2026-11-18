@echo off
title SecureShop - Mo ket noi cho laptop 2
REM =====================================================================
REM  Chay tren LAPTOP 1, moi lan doi sang WiFi moi. Can quyen Administrator.
REM   1. Chuyen WiFi dang ket noi sang "Rieng tu" (Private)
REM   2. Mo cong 5173 tren tuong lua (chi trong mang Rieng tu) de laptop 2 vao duoc web
REM =====================================================================

REM ---- Tu xin quyen Administrator (Windows hoi Yes/No) ----
net session >nul 2>&1
if errorlevel 1 (
  echo Can quyen Administrator. Windows se hoi, hay bam "Yes"...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo ============================================================
echo  SecureShop - MO KET NOI CHO LAPTOP 2
echo ============================================================
echo.
echo [1/2] Chuyen WiFi dang ket noi sang mang Rieng tu (Private)...
powershell -NoProfile -Command "Get-NetConnectionProfile | Where-Object { (Get-NetAdapter -InterfaceIndex $_.InterfaceIndex).HardwareInterface } | ForEach-Object { Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private -ErrorAction SilentlyContinue; Write-Host ('      ' + $_.InterfaceAlias + ' (' + $_.Name + ') -> Rieng tu') }"

echo [2/2] Mo cong 5173 tren tuong lua...
powershell -NoProfile -Command "if (Get-NetFirewallRule -DisplayName 'SecureShop (cong 5173)' -ErrorAction SilentlyContinue) { Write-Host '      Da mo san tu truoc.' } else { New-NetFirewallRule -DisplayName 'SecureShop (cong 5173)' -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private | Out-Null; Write-Host '      Da mo cong 5173.' }"

echo.
echo ============================================================
echo  XONG! Gio chay start-demo-2-may.bat de bat web cho 2 may.
echo ============================================================
echo.
pause
