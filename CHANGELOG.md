# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [[0;34m[INFO][0m Bumping version...
[0;32m[SUCCESS][0m Version bumped to: 1.0.2
1.0.2] - 2025-08-10

## [0340...03201.0.31.0.3] - 2025-08-10

## [[0;34m[INFO][0m Bumping version...
[0;32m[SUCCESS][0m Version bumped to: 1.0.4
1.0.4] - 2025-08-10

## [[0;34m[INFO][0m Bumping version...
[0;32m[SUCCESS][0m Version bumped to: 1.0.6
1.0.6] - 2025-08-10

## [1.0.7] - 2025-08-10

## [1.0.8] - 2025-08-10

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
