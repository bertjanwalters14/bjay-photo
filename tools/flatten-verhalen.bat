@echo off
where python >nul 2>nul
if errorlevel 1 (
    echo Python niet gevonden. Installeer via python.org en vink "Add Python to PATH" aan.
    pause
    exit /b 1
)
python "%~dp0flatten-verhalen.py"
echo.
pause
