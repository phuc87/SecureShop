@echo off
title SecureShop - Backend (Spring Boot, cong 8081)
cd /d "%~dp0backend"
echo ============================================================
echo  SecureShop BACKEND - Spring Boot, cong 8081
echo  - Can bat MySQL trong XAMPP truoc.
echo  - Cho dong "Started SecureShopApplication" la chay xong.
echo  - Dong cua so nay = tat backend.
echo ============================================================
echo.
call mvn spring-boot:run
echo.
echo Backend da dung. Nhan phim bat ky de dong cua so...
pause >nul
