# Release v${{ github.ref_name }}

## 🎉 What's New

This release includes:
- Bug fixes and improvements
- Enhanced Python virtual environment support
- Better error handling and logging

## 🚀 Installation

```bash
npm install -g homebridge-philips-air-purifier-pyaircontrol@${{ github.ref_name }}
```

## 📋 Configuration

Make sure to update your `pythonVenvPath` in the configuration if needed. The plugin will automatically set up a Python virtual environment during installation.

## 🔧 Features

- **Python Virtual Environment**: Automatic setup and dependency management
- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **HomeKit Integration**: Full integration with Apple Home app
- **Air Quality Monitoring**: Real-time PM2.5 density readings
- **Filter Status**: Monitor filter life and change indicators

## 🐛 Bug Fixes

- Fixed Python dependency conflicts
- Improved error handling and logging
- Enhanced virtual environment setup reliability

## 📚 Documentation

- Updated README with virtual environment information
- Added comprehensive troubleshooting guide
- Included virtual environment setup documentation

## 🔄 Breaking Changes

**None** - This is a backward-compatible release.

## 📦 Files Included

- Compiled TypeScript output (`dist/`)
- Python scripts and setup files (`python_scripts/`)
- Virtual environment setup scripts
- Configuration schema
- Comprehensive documentation

## 🧪 Testing

The plugin has been tested with:
- Homebridge v1.6.0+
- Node.js v16.0.0+
- Python 3.6+
- Various Philips Air Purifier models

## 🆘 Support

If you encounter any issues:
1. Check the [troubleshooting guide](https://github.com/${{ github.repository }}/blob/main/README.md#troubleshooting)
2. Review the [virtual environment setup guide](https://github.com/${{ github.repository }}/blob/main/VIRTUAL_ENV_SETUP.md)
3. Create an issue on GitHub with detailed information

## 🙏 Acknowledgments

Thanks to all contributors and users who provided feedback and testing for this release!

---

**Note**: This plugin is not officially affiliated with Philips. Use at your own risk and ensure compliance with your device's warranty terms.
