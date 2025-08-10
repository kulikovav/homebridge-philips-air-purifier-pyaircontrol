# Homebridge Philips Air Purifier Plugin

A Homebridge plugin that allows you to control Philips Air Purifiers using the aioairctrl Python module. This plugin integrates your Philips Air Purifier with Apple HomeKit, enabling you to control it through the Home app, Siri, and HomeKit automations.

## Features

- **Power Control**: Turn your air purifier on/off
- **Fan Speed Control**: Adjust fan speed with percentage-based control
- **Mode Selection**: Switch between Auto and Manual modes
- **Air Quality Monitoring**: Display PM2.5 density readings
- **Filter Status**: Monitor filter life and change indicators
- **Temperature & Humidity**: Display environmental sensor data
- **Real-time Updates**: Automatic status polling with configurable intervals

## Prerequisites

1. **Homebridge**: This plugin requires Homebridge to be installed and running
2. **Python 3**: Python 3.6 or higher must be installed on your system
3. **Virtual Environment**: The plugin automatically creates a Python virtual environment during installation

### Python Requirements

- **Python 3.6+**: Must be installed and accessible via `python3` (Linux/macOS) or `python` (Windows)
- **Virtual Environment**: Automatically created during plugin installation
- **Dependencies**: Automatically installed in the virtual environment

## Installation

1. Install the plugin via Homebridge UI or npm:

```bash
npm install -g homebridge-philips-air-purifier-pyaircontrol
```

**Note**: The plugin will automatically set up a Python virtual environment and install required dependencies during installation.

2. Add the platform to your Homebridge configuration file (`config.json`):

```json
{
  "platforms": [
    {
      "platform": "PhilipsAirPurifierPyAirControl",
      "devices": [
        {
          "name": "Living Room Air Purifier",
          "ip": "192.168.1.100",
          "protocol": "coaps",
          "pollingInterval": 10,
          "pythonVenvPath": "/path/to/your/plugin/python_venv/bin/python"
        }
      ]
    }
  ]
}
```

### Automatic Virtual Environment Setup

During installation, the plugin automatically:

1. Creates a Python virtual environment in the plugin directory
2. Installs required Python dependencies (`aioairctrl`, `aiocoap`, `requests`)
3. Provides the path to the Python executable for configuration

**Important**: After installation, the plugin will display the path to the Python executable. Use this path as the `pythonVenvPath` in your configuration.

## Configuration

### Device Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | ✅ | - | Display name for the accessory in HomeKit |
| `ip` | string | ✅ | - | IP address of your Philips Air Purifier |
| `protocol` | string | ❌ | `coaps` | Communication protocol: `coap`, `coaps`, or `http` |
| `pollingInterval` | number | ❌ | `10` | Status update interval in seconds (minimum 5) |
| `pythonVenvPath` | string | ❌ | - | Full path to Python executable in virtual environment (recommended) |

### Protocol Options

- **`coaps`** (default): Encrypted CoAP protocol - recommended for most devices
- **`coap`**: Unencrypted CoAP protocol

**Note**: HTTP protocol is not supported with the aioairctrl library.

### Virtual Environment Configuration

The `pythonVenvPath` parameter should point to the Python executable within the plugin's virtual environment:

- **Linux/macOS**: `/path/to/plugin/python_venv/bin/python`
- **Windows**: `C:\path\to\plugin\python_venv\Scripts\python.exe`

**Recommendation**: Always use the virtual environment Python path for consistent dependency management and isolation.

## Supported Devices

This plugin is designed to work with Philips Air Purifiers that are compatible with the aioairctrl module, including:

- Philips Series 2000
- Philips Series 3000
- Philips Series 4000
- And other compatible models

## HomeKit Integration

Once configured, your air purifier will appear in the Home app with the following services:

### Air Purifier Service

- **Active**: Power on/off
- **Current Air Purifier State**: Shows current operating state
- **Target Air Purifier State**: Switch between Auto/Manual modes
- **Rotation Speed**: Fan speed control (0-100%)
- **PM2.5 Density**: Air quality measurement
- **Filter Life Level**: Filter replacement indicator
- **Filter Change Indication**: Filter change status

### Fan Service (Optional)

- **On**: Power control
- **Rotation Speed**: Fan speed control

### Temperature Sensor (Optional)

- **Current Temperature**: Ambient temperature reading

### Humidity Sensor (Optional)

- **Current Relative Humidity**: Humidity percentage

## Troubleshooting

### Common Issues

1. **Device Not Responding**
   - Verify the IP address is correct
   - Check that the device is on the same network
   - Ensure the protocol setting matches your device

2. **Python Script Errors**
   - Verify the virtual environment is properly set up
   - Check the `pythonVenvPath` configuration points to the correct executable
   - Ensure the plugin's postinstall script completed successfully
   - Run `npm run postinstall` to re-run the virtual environment setup

3. **Virtual Environment Issues**
   - **Setup Failed**: Ensure Python 3.6+ is installed and accessible
   - **Dependencies Missing**: Run the setup script manually:
     - **Linux/macOS**: `cd python_scripts && bash setup_venv.sh`
     - **Windows**: `cd python_scripts && setup_venv.bat`
   - **Path Issues**: Verify the `pythonVenvPath` in your configuration matches the actual path

4. **Connection Issues**
   - Try different protocols (coaps, coap, http)
   - Check firewall settings
   - Verify network connectivity

### Manual Virtual Environment Setup

If the automatic setup fails, you can manually create the virtual environment:

```bash
# Navigate to the plugin directory
cd /path/to/homebridge-philips-air-purifier-pyaircontrol

# Create virtual environment
python3 -m venv python_venv

# Activate virtual environment
source python_venv/bin/activate  # Linux/macOS
# or
python_venv\Scripts\activate     # Windows

# Install dependencies
pip install -r python_scripts/requirements.txt
```

### Debug Mode

Enable debug logging in Homebridge to see detailed information about device communication and status updates.

## Development

### Building from Source

```bash
git clone <repository-url>
cd homebridge-philips-air-purifier-pyaircontrol
npm install
npm run build
```

### Running Tests

```bash
npm run lint
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [aioairctrl](https://github.com/rgerganov/aioairctrl) - Async Python library for controlling Philips Air Purifiers
- [Homebridge](https://homebridge.io/) - HomeKit bridge for non-HomeKit devices

## Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Search existing [issues](https://github.com/your-username/homebridge-philips-air-purifier-pyaircontrol/issues)
3. Create a new issue with detailed information about your setup and the problem

---

**Note**: This plugin is not officially affiliated with Philips. Use at your own risk and ensure compliance with your device's warranty terms.
