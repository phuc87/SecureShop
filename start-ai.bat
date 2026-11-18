@echo off
title SecureShop - AI service (Python, cong 8000)
cd /d "%~dp0ai-service"
echo ============================================================
echo  SecureShop AI SERVICE - FastAPI, cong 8000 (chi may nay goi duoc)
echo  - Tai lieu API: http://127.0.0.1:8000/docs
echo  - Dong cua so nay = tat tro ly AI (web van chay, AI bao "tam nghi").
echo ============================================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Python. Tai tai https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^).
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Lan dau chay: tao moi truong ao .venv va cai thu vien ^(1-3 phut^)...
  python -m venv .venv
  if errorlevel 1 goto fail
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
  if errorlevel 1 goto fail
)
if not exist "models\intent_model.joblib" (
  echo Chua co model: dang train lan dau...
  ".venv\Scripts\python.exe" train_intent.py
  if errorlevel 1 goto fail
)
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
echo.
echo AI service da dung. Nhan phim bat ky de dong cua so...
pause >nul
exit /b 0

:fail
echo.
echo [LOI] Khong cai dat / train duoc. Xem thong bao loi phia tren.
pause
exit /b 1
