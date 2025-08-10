# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2025-08-10

### Fixed
- **Critical Bug Fix**: Fixed Python script API compatibility with py-air-control v1.0.0+
- Updated class names: `CoAPClient` → `CoAPAirClient`, `HTTPClient` → `HTTPAirClient`
- Updated method names: `set_value` → `set_values` (plural)
- Resolves error: "module 'pyairctrl.coap_client' has no attribute 'CoAPClient'"
- Plugin now works with current versions of py-air-control library

### Changed
- **Python Library Migration**: Replaced `py-air-control` with `aioairctrl` for better async performance
- Updated Python scripts to use async/await syntax for improved reliability
- Enhanced CoAP client initialization with proper encryption support
- Better error handling and resource management in Python scripts
- **Protocol Support**: Removed HTTP protocol support (aioairctrl only supports CoAP/CoAPS)
- **Dependencies**: Removed `requests` dependency (no longer needed for HTTP support)

### Added
- **Performance & Reliability Improvements**: Added comprehensive timeout and retry mechanisms
- Script execution timeout (configurable, default 30 seconds) to prevent Homebridge hanging
- Automatic retry logic for network-related errors with exponential backoff
- Configurable retry count (default 2 retries)
- Safe fallback values for all characteristics when device is unreachable
- Optional polling disable after consecutive errors to prevent spam
- Automatic polling re-enable when communication is restored
- Enhanced error handling for CoAP communication failures like "Give up on message"

## [1.0.9] - 2025-08-10

## [1.0.10] - 2025-08-10

## [1.1.0] - 2025-08-10

### Added
- **Enhanced Polling System**: New intelligent polling manager for improved reliability and performance
- **DevicePollingManager**: Python-based device management with automatic reconnection and error recovery
- **Smart Status Caching**: Efficient device status caching to reduce network traffic
- **Automatic Error Recovery**: Built-in retry mechanisms and connection management
- **Plugin Polling Interface**: Clean interface between Node.js plugin and Python polling manager
- **Backward Compatibility**: Option to use original polling method if needed

### Changed
- **Default Behavior**: Enhanced polling is now enabled by default for all new installations
- **Configuration**: Added `useEnhancedPolling` option to device configuration
- **Performance**: Improved device response times and reduced network overhead
- **Reliability**: Better handling of network interruptions and device disconnections

### Enhanced Features
- **Intelligent Polling**: Devices are only polled when necessary, reducing unnecessary network traffic
- **Connection Management**: Automatic device discovery and connection management
- **Error Handling**: Comprehensive error handling with automatic recovery
- **Status Monitoring**: Real-time device status monitoring with configurable intervals

## [1.1.1] - 2025-08-11

## [Unreleased]

### Added
- Python virtual environment support for dependency isolation
- Automatic virtual environment setup during plugin installation
- Cross-platform setup scripts (Linux/macOS/Windows)
- Comprehensive publishing tools and documentation
- GitHub Actions workflow for automated publishing

### Changed
- Enhanced error handling and logging
- Improved Python script execution with virtual environment support
- Updated configuration schema to include `pythonVenvPath`

### Fixed
- Python dependency conflicts with system packages
- Installation issues on different platforms
- Build and packaging improvements

## [1.0.1] - 2024-01-XX

### Fixed
- **Critical Bug Fix**: Fixed infinite recursion in `getErrorMessage` method that caused "Maximum call stack size exceeded" error
- Plugin now starts successfully without crashing during initialization
- Improved error handling for Python script execution and JSON parsing

## [1.0.0] - 2024-01-XX

### Added
- Initial release of Homebridge Philips Air Purifier Plugin
- Support for Philips Air Purifier Series 2000, 3000, and 4000
- Power control and fan speed adjustment
- Air quality monitoring (PM2.5 density)
- Filter status monitoring
- Temperature and humidity sensor support
- Multiple protocol support (CoAP, CoAPS, HTTP)
- Configurable polling intervals
- HomeKit integration with Apple Home app

### Features
- **Air Purifier Service**: Power, mode, fan speed, air quality
- **Fan Service**: Additional fan control interface
- **Temperature Sensor**: Ambient temperature readings
- **Humidity Sensor**: Relative humidity percentage
- **Filter Monitoring**: Life level and change indicators

---

## Version History

- **1.0.1**: Critical bug fix for infinite recursion in error handling
- **1.0.0**: Initial release with core functionality
- **Future versions**: Will be documented here as they are released

## Contributing

When contributing to this project, please update this changelog with any significant changes, following the format above.

## Release Process

1. **Patch Release** (1.0.0 → 1.0.1): Bug fixes and minor improvements
2. **Minor Release** (1.0.0 → 1.1.0): New features, backward compatible
3. **Major Release** (1.0.0 → 2.0.0): Breaking changes

## Support

For support and questions:
- Check the [README.md](README.md) for documentation
- Review the [troubleshooting guide](README.md#troubleshooting)
- Create an issue on GitHub for bugs or feature requests
