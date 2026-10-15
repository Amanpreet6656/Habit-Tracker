@echo off
title YouTube Video Summarizer - TubeBrief AI
echo ========================================================
echo       TubeBrief AI - YouTube Video Summarizer
echo ========================================================
echo.
echo Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b
)

echo Installing/checking dependencies from requirements.txt...
python -m pip install -r requirements.txt --quiet

echo.
echo Starting web server on http://localhost:8000 ...
echo Press Ctrl+C in this window anytime to stop the server.
echo.

start http://localhost:8000
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
