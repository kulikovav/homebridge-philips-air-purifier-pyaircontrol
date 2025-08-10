#!/bin/bash
# Setup script for Python virtual environment and dependencies
# This script is automatically run during plugin installation

set -e

echo "Setting up Python virtual environment for Homebridge Philips Air Purifier Plugin..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Go up to the plugin root directory
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
# Create venv in the plugin directory
VENV_PATH="$PLUGIN_ROOT/python_venv"

# Check if virtual environment already exists
if [ -d "$VENV_PATH" ]; then
    echo "Virtual environment already exists at: $VENV_PATH"

    # Check if Python executable exists in the venv
    if [ -f "$VENV_PATH/bin/python" ]; then
        echo "Python executable found at: $VENV_PATH/bin/python"
        echo "Setup complete!"
        exit 0
    else
        echo "Virtual environment exists but Python executable not found, recreating..."
        rm -rf "$VENV_PATH"
    fi
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.6 or higher and try again"
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment at: $VENV_PATH"
python3 -m venv "$VENV_PATH"

if [ $? -ne 0 ]; then
    echo "Failed to create virtual environment"
    exit 1
fi

echo "Virtual environment created successfully"

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing Python dependencies..."
if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    pip install -r "$SCRIPT_DIR/requirements.txt"
else
    echo "requirements.txt not found, skipping dependency installation"
fi

# Verify setup
if [ -f "$VENV_PATH/bin/python" ]; then
    echo "Setup complete! Python executable available at: $VENV_PATH/bin/python"
    echo "You can now use this path in your plugin configuration as 'pythonVenvPath'"
    exit 0
else
    echo "Setup failed: Python executable not found in virtual environment"
    exit 1
fi
