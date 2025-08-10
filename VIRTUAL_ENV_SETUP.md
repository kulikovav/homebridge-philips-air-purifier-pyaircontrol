# Python Virtual Environment Setup

This document explains how the Homebridge Philips Air Purifier Plugin automatically sets up and manages a Python virtual environment.

## Overview

The plugin now automatically creates a Python virtual environment during installation, ensuring:

- **Dependency Isolation**: Python dependencies are isolated from system Python
- **Consistent Environment**: All users get the same Python environment
- **Easy Setup**: No manual Python dependency installation required
- **Cross-Platform Support**: Works on Windows, macOS, and Linux

## Automatic Setup Process

### During Plugin Installation

1. **Postinstall Script**: The `scripts/postinstall.js` script runs automatically
2. **Platform Detection**: Detects the operating system (Windows/Linux/macOS)
3. **Virtual Environment Creation**: Creates `python_venv/` directory in plugin root
4. **Dependency Installation**: Installs required Python packages from `requirements.txt`
5. **Path Generation**: Provides the Python executable path for configuration

### Required Python Packages

The following packages are automatically installed:

- `py-air-control>=1.0.0` - Main library for controlling Philips Air Purifiers
- `aiocoap>=0.4.0` - Asynchronous CoAP library
- `requests>=2.25.0` - HTTP library for HTTP protocol support

## Configuration

### Using Virtual Environment

Add the `pythonVenvPath` parameter to your device configuration:

```json
{
  "platform": "PhilipsAirPurifierPyAirControl",
  "devices": [
    {
      "name": "Living Room Air Purifier",
      "ip": "192.168.1.100",
      "protocol": "coaps",
      "pythonVenvPath": "/path/to/plugin/python_venv/bin/python"
    }
  ]
}
```

### Path Examples

**Linux/macOS:**

```
"pythonVenvPath": "/usr/local/lib/node_modules/homebridge-philips-air-purifier-pyaircontrol/python_venv/bin/python"
```

**Windows:**

```
"pythonVenvPath": "C:\\Users\\username\\AppData\\Roaming\\npm\\node_modules\\homebridge-philips-air-purifier-pyaircontrol\\python_venv\\Scripts\\python.exe"
```

## Manual Setup

If automatic setup fails, you can manually create the virtual environment:

### Linux/macOS

```bash
cd python_scripts
bash setup_venv.sh
```

### Windows

```cmd
cd python_scripts
setup_venv.bat
```

### Manual Commands

```bash
# Create virtual environment
python3 -m venv python_venv

# Activate (Linux/macOS)
source python_venv/bin/activate

# Activate (Windows)
python_venv\Scripts\activate

# Install dependencies
pip install -r python_scripts/requirements.txt
```

## Troubleshooting

### Common Issues

1. **Python Not Found**
   - Ensure Python 3.6+ is installed and in PATH
   - Run `python3 --version` or `python --version`

2. **Virtual Environment Creation Failed**
   - Check disk space and permissions
   - Ensure `venv` module is available: `python3 -m venv --help`

3. **Dependencies Installation Failed**
   - Check internet connection
   - Verify pip is working: `pip --version`
   - Try upgrading pip: `pip install --upgrade pip`

4. **Path Issues**
   - Use absolute paths in configuration
   - Verify the path exists and is executable
   - Check file permissions

### Verification

Test your virtual environment setup:

```bash
# Test Python executable
python_venv/bin/python --version

# Test dependencies
python_venv/bin/python python_scripts/test_venv.py

# Test air purifier scripts (with valid IP)
python_venv/bin/python python_scripts/get_status.py 192.168.1.100 coaps
```

## File Structure

```sh
plugin-root/
├── python_scripts/
│   ├── requirements.txt          # Python dependencies
│   ├── setup_venv.py            # Python setup script
│   ├── setup_venv.sh            # Unix setup script
│   ├── setup_venv.bat           # Windows setup script
│   ├── test_venv.py             # Environment test script
│   ├── get_status.py            # Status retrieval script
│   └── set_value.py             # Value setting script
├── python_venv/                  # Virtual environment (created automatically)
│   ├── bin/ (or Scripts/ on Windows)
│   │   └── python               # Python executable
│   └── lib/ (or Lib/ on Windows)
│       └── python3.x/site-packages/  # Installed packages
├── scripts/
│   └── postinstall.js           # NPM postinstall script
└── package.json                  # Plugin configuration
```

## Benefits

- **Isolation**: No conflicts with system Python packages
- **Reproducibility**: Same environment across different systems
- **Maintenance**: Easy to recreate or update the environment
- **Security**: Limited access to system Python packages
- **Portability**: Environment travels with the plugin

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the verification commands
3. Check Homebridge logs for error messages
4. Ensure Python 3.6+ is installed and accessible
5. Try manual setup if automatic setup fails
