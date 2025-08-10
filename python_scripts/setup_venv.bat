@echo off
REM Setup script for Python virtual environment and dependencies
REM This script is automatically run during plugin installation

echo Setting up Python virtual environment for Homebridge Philips Air Purifier Plugin...

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
REM Go up to the plugin root directory
for %%i in ("%SCRIPT_DIR%..") do set "PLUGIN_ROOT=%%~fi"
REM Create venv in the plugin directory
set "VENV_PATH=%PLUGIN_ROOT%python_venv"

REM Check if virtual environment already exists
if exist "%VENV_PATH%" (
    echo Virtual environment already exists at: %VENV_PATH%

    REM Check if Python executable exists in the venv
    if exist "%VENV_PATH%\Scripts\python.exe" (
        echo Python executable found at: %VENV_PATH%\Scripts\python.exe
        echo Setup complete!
        exit /b 0
    ) else (
        echo Virtual environment exists but Python executable not found, recreating...
        rmdir /s /q "%VENV_PATH%"
    )
)

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.6 or higher and try again
    exit /b 1
)

REM Create virtual environment
echo Creating virtual environment at: %VENV_PATH%
python -m venv "%VENV_PATH%"

if errorlevel 1 (
    echo Failed to create virtual environment
    exit /b 1
)

echo Virtual environment created successfully

REM Activate virtual environment
call "%VENV_PATH%\Scripts\activate.bat"

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo Installing Python dependencies...
if exist "%SCRIPT_DIR%requirements.txt" (
    pip install -r "%SCRIPT_DIR%requirements.txt"
) else (
    echo requirements.txt not found, skipping dependency installation
)

REM Verify setup
if exist "%VENV_PATH%\Scripts\python.exe" (
    echo Setup complete! Python executable available at: %VENV_PATH%\Scripts\python.exe
    echo You can now use this path in your plugin configuration as 'pythonVenvPath'
    exit /b 0
) else (
    echo Setup failed: Python executable not found in virtual environment
    exit /b 1
)
