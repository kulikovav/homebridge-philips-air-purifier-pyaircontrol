#!/usr/bin/env python3
"""
Setup script for Python virtual environment and dependencies.
This script is automatically run during plugin installation.
"""

import os
import sys
import subprocess
import venv
import platform
from pathlib import Path

def get_python_executable():
    """Get the appropriate Python executable path."""
    if platform.system() == "Windows":
        return "python"
    return "python3"

def get_venv_path():
    """Get the virtual environment path relative to the plugin directory."""
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.absolute()
    # Go up to the plugin root directory
    plugin_root = script_dir.parent
    # Create venv in the plugin directory
    return plugin_root / "python_venv"

def create_virtual_environment(venv_path):
    """Create a new virtual environment."""
    print(f"Creating virtual environment at: {venv_path}")

    try:
        venv.create(venv_path, with_pip=True)
        print("Virtual environment created successfully")
        return True
    except Exception as e:
        print(f"Failed to create virtual environment: {e}")
        return False

def get_pip_executable(venv_path):
    """Get the pip executable path within the virtual environment."""
    if platform.system() == "Windows":
        return venv_path / "Scripts" / "pip.exe"
    return venv_path / "bin" / "pip"

def get_python_executable_in_venv(venv_path):
    """Get the Python executable path within the virtual environment."""
    if platform.system() == "Windows":
        return venv_path / "Scripts" / "python.exe"
    return venv_path / "bin" / "python"

def install_dependencies(venv_path):
    """Install Python dependencies in the virtual environment."""
    pip_executable = get_pip_executable(venv_path)
    requirements_file = Path(__file__).parent / "requirements.txt"

    if not requirements_file.exists():
        print("requirements.txt not found, skipping dependency installation")
        return True

    print("Installing Python dependencies...")

    try:
        # Upgrade pip first
        subprocess.run([str(pip_executable), "install", "--upgrade", "pip"],
                      check=True, capture_output=True, text=True)

        # Install requirements
        result = subprocess.run([str(pip_executable), "install", "-r", str(requirements_file)],
                              check=True, capture_output=True, text=True)

        print("Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install dependencies: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False

def main():
    """Main setup function."""
    print("Setting up Python virtual environment for Homebridge Philips Air Purifier Plugin...")

    # Get virtual environment path
    venv_path = get_venv_path()

    # Check if virtual environment already exists
    if venv_path.exists():
        print(f"Virtual environment already exists at: {venv_path}")
        python_exec = get_python_executable_in_venv(venv_path)
        if python_exec.exists():
            print(f"Python executable found at: {python_exec}")
            print("Setup complete!")
            return 0
        else:
            print("Virtual environment exists but Python executable not found, recreating...")
            import shutil
            shutil.rmtree(venv_path)

    # Create virtual environment
    if not create_virtual_environment(venv_path):
        return 1

    # Install dependencies
    if not install_dependencies(venv_path):
        return 1

    # Verify setup
    python_exec = get_python_executable_in_venv(venv_path)
    if python_exec.exists():
        print(f"Setup complete! Python executable available at: {python_exec}")
        print("You can now use this path in your plugin configuration as 'pythonVenvPath'")
        return 0
    else:
        print("Setup failed: Python executable not found in virtual environment")
        return 1

if __name__ == "__main__":
    sys.exit(main())
