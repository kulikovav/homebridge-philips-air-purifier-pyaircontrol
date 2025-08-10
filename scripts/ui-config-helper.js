#!/usr/bin/env node
/**
 * Homebridge UI Configuration Helper for Philips Air Purifier Plugin
 * This script helps update Homebridge UI configuration files
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATHS = [
  path.join(os.homedir(), '.homebridge', 'config.json'),
  path.join(process.cwd(), 'config.json'),
  path.join(process.cwd(), '.homebridge', 'config.json')
];

// Homebridge UI specific paths
const UI_CONFIG_PATHS = [
  path.join(os.homedir(), '.homebridge', 'ui-config.json'),
  path.join(process.cwd(), '.homebridge', 'ui-config.json'),
  path.join(process.cwd(), 'ui-config.json')
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'info' ? 'ℹ️' : '✅';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function getVenvPythonPath() {
  const isWindows = os.platform() === 'win32';
  if (isWindows) {
    return path.join(PLUGIN_ROOT, 'python_venv', 'Scripts', 'python.exe');
  }
  return path.join(PLUGIN_ROOT, 'python_venv', 'bin', 'python');
}

function findConfigFiles() {
  const configs = {
    main: null,
    ui: null
  };

  for (const configPath of CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      configs.main = configPath;
      break;
    }
  }

  for (const uiConfigPath of UI_CONFIG_PATHS) {
    if (fs.existsSync(uiConfigPath)) {
      configs.ui = uiConfigPath;
      break;
    }
  }

  return configs;
}

function backupFile(filePath) {
  if (!filePath) return null;

  const backupPath = filePath + '.backup.' + Date.now();
  try {
    fs.copyFileSync(filePath, backupPath);
    log(`Configuration backed up to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    log(`Failed to backup configuration: ${error.message}`, 'error');
    return null;
  }
}

function updateMainConfig(configPath) {
  if (!configPath) return false;

  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    let configUpdated = false;
    const venvPath = getVenvPythonPath();

    if (config.platforms) {
      for (const platform of config.platforms) {
        if (platform.platform === 'PhilipsAirPurifierPyAirControl' && platform.devices) {
          for (const device of platform.devices) {
            if (!device.pythonVenvPath) {
              device.pythonVenvPath = venvPath;
              configUpdated = true;
              log(`Updated device "${device.name}" with pythonVenvPath: ${venvPath}`);
            }
          }
        }
      }
    }

    if (configUpdated) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      log(`Main configuration updated successfully in: ${configPath}`);
      return true;
    }

    return false;
  } catch (error) {
    log(`Failed to update main configuration: ${error.message}`, 'error');
    return false;
  }
}

function updateUIConfig(uiConfigPath) {
  if (!uiConfigPath) return false;

  try {
    const uiConfigContent = fs.readFileSync(uiConfigPath, 'utf8');
    const uiConfig = JSON.parse(uiConfigContent);

    let configUpdated = false;
    const venvPath = getVenvPythonPath();

    // Update UI configuration for the plugin
    if (uiConfig.platforms) {
      for (const platform of uiConfig.platforms) {
        if (platform.platform === 'PhilipsAirPurifierPyAirControl' && platform.devices) {
          for (const device of platform.devices) {
            if (!device.pythonVenvPath) {
              device.pythonVenvPath = venvPath;
              configUpdated = true;
              log(`Updated UI config for device "${device.name}" with pythonVenvPath: ${venvPath}`);
            }
          }
        }
      }
    }

    if (configUpdated) {
      fs.writeFileSync(uiConfigPath, JSON.stringify(uiConfig, null, 2));
      log(`UI configuration updated successfully in: ${uiConfigPath}`);
      return true;
    }

    return false;
  } catch (error) {
    log(`Failed to update UI configuration: ${error.message}`, 'error');
    return false;
  }
}

function createCompleteSampleConfig() {
  const venvPath = getVenvPythonPath();
  const sampleConfig = {
    "bridge": {
      "name": "Homebridge",
      "username": "CC:22:3D:E3:CE:30",
      "port": 51826,
      "pin": "031-45-154"
    },
    "platforms": [
      {
        "platform": "PhilipsAirPurifierPyAirControl",
        "name": "Philips Air Purifier Platform",
        "devices": [
          {
            "name": "Living Room Air Purifier",
            "ip": "192.168.1.100",
            "protocol": "coaps",
            "pollingInterval": 30,
            "pythonVenvPath": venvPath
          }
        ]
      }
    ]
  };

  const samplePath = path.join(PLUGIN_ROOT, 'complete-sample-config.json');
  try {
    fs.writeFileSync(samplePath, JSON.stringify(sampleConfig, null, 2));
    log(`Complete sample configuration created at: ${samplePath}`);
    return samplePath;
  } catch (error) {
    log(`Failed to create complete sample configuration: ${error.message}`, 'error');
    return null;
  }
}

function showAdvancedInstructions() {
  const venvPath = getVenvPythonPath();

  log('Advanced Configuration Instructions:', 'info');
  log('', 'info');
  log('For Homebridge UI users:', 'info');
  log('1. Open Homebridge UI in your browser', 'info');
  log('2. Go to "Plugins" and find "Philips Air Purifier PyAirControl"', 'info');
  log('3. Click "Settings" and configure your devices', 'info');
  log('4. The pythonVenvPath will be automatically populated', 'info');
  log('', 'info');
  log('For manual configuration users:', 'info');
  log('1. Edit your config.json file', 'info');
  log('2. Add the platform configuration below', 'info');
  log('3. Replace "YOUR_DEVICE_IP" with your actual device IP', 'info');
  log('', 'info');
  log('Sample configuration:', 'info');
  log('{', 'info');
  log('  "platform": "PhilipsAirPurifierPyAirControl",', 'info');
  log('  "name": "Philips Air Purifier Platform",', 'info');
  log('  "devices": [', 'info');
  log('    {', 'info');
  log('      "name": "Your Air Purifier Name",', 'info');
  log('      "ip": "YOUR_DEVICE_IP",', 'info');
  log('      "protocol": "coaps",', 'info');
  log('      "pollingInterval": 30,', 'info');
  log('      "pythonVenvPath": "' + venvPath.replace(/\\/g, '\\\\') + '"', 'info');
  log('    }', 'info');
  log('  ]', 'info');
  log('}', 'info');
}

function main() {
  log('Homebridge UI Configuration Helper for Philips Air Purifier Plugin');
  log('===============================================================');

  // Check if virtual environment exists
  const venvPath = getVenvPythonPath();
  if (!fs.existsSync(venvPath)) {
    log('Python virtual environment not found. Please run the postinstall script first:', 'error');
    log('  npm run postinstall', 'error');
    return;
  }

  log(`Python virtual environment found at: ${venvPath}`);

  // Find configuration files
  const configs = findConfigFiles();

  if (configs.main) {
    log(`Found main configuration at: ${configs.main}`);
    backupFile(configs.main);
    updateMainConfig(configs.main);
  }

  if (configs.ui) {
    log(`Found UI configuration at: ${configs.ui}`);
    backupFile(configs.ui);
    updateUIConfig(configs.ui);
  }

  if (!configs.main && !configs.ui) {
    log('No Homebridge configuration found. Creating sample configurations...', 'warn');
    createCompleteSampleConfig();
  }

  log('', 'info');
  showAdvancedInstructions();

  log('', 'info');
  log('Configuration update completed!', 'info');
  log('Next steps:', 'info');
  log('1. Restart Homebridge', 'info');
  log('2. Check the logs for any errors', 'info');
  log('3. Your Philips Air Purifier should now appear in HomeKit', 'info');
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  updateMainConfig,
  updateUIConfig,
  createCompleteSampleConfig,
  findConfigFiles,
  getVenvPythonPath
};
