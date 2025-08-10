#!/usr/bin/env node
/**
 * Configuration Helper for Homebridge Philips Air Purifier Plugin
 * This script helps automatically populate pythonVenvPath in Homebridge config
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATHS = [
  path.join(os.homedir(), '.homebridge', 'config.json'),
  path.join(process.cwd(), 'config.json'),
  path.join(process.cwd(), '.homebridge', 'config.json')
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function isWindows() {
  return os.platform() === 'win32';
}

function getVenvPythonPath() {
  if (isWindows()) {
    return path.join(PLUGIN_ROOT, 'python_venv', 'Scripts', 'python.exe');
  }
  return path.join(PLUGIN_ROOT, 'python_venv', 'bin', 'python');
}

function findHomebridgeConfig() {
  for (const configPath of CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

function backupConfig(configPath) {
  const backupPath = configPath + '.backup.' + Date.now();
  try {
    fs.copyFileSync(configPath, backupPath);
    log(`Configuration backed up to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    log(`Failed to backup configuration: ${error.message}`, 'error');
    return null;
  }
}

function updateConfigWithPythonVenv(configPath) {
  try {
    // Read the current configuration
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    let configUpdated = false;
    const venvPath = getVenvPythonPath();

    // Check if the plugin configuration exists
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
      // Write the updated configuration back
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      log(`Configuration updated successfully in: ${configPath}`);
      return true;
    } else {
      log('No configuration updates needed - pythonVenvPath already set or plugin not configured');
      return false;
    }

  } catch (error) {
    log(`Failed to update configuration: ${error.message}`, 'error');
    return false;
  }
}

function createSampleConfig() {
  const venvPath = getVenvPythonPath();
  const sampleConfig = {
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

  const samplePath = path.join(PLUGIN_ROOT, 'sample-config.json');
  try {
    fs.writeFileSync(samplePath, JSON.stringify(sampleConfig, null, 2));
    log(`Sample configuration created at: ${samplePath}`);
    return samplePath;
  } catch (error) {
    log(`Failed to create sample configuration: ${error.message}`, 'error');
    return null;
  }
}

function showConfigurationInstructions() {
  const venvPath = getVenvPythonPath();

  log('Configuration Instructions:', 'info');
  log('', 'info');
  log('To use this plugin, add the following to your Homebridge config.json:', 'info');
  log('', 'info');
  log('{', 'info');
  log('  "platforms": [', 'info');
  log('    {', 'info');
  log('      "platform": "PhilipsAirPurifierPyAirControl",', 'info');
  log('      "name": "Philips Air Purifier Platform",', 'info');
  log('      "devices": [', 'info');
  log('        {', 'info');
  log('          "name": "Your Air Purifier Name",', 'info');
  log('          "ip": "YOUR_DEVICE_IP",', 'info');
  log('          "protocol": "coaps",', 'info');
  log('          "pollingInterval": 30,', 'info');
  log('          "pythonVenvPath": "' + venvPath.replace(/\\/g, '\\\\') + '"', 'info');
  log('        }', 'info');
  log('      ]', 'info');
  log('    }', 'info');
  log('  ]', 'info');
  log('}', 'info');
  log('', 'info');
  log('Important: Replace "YOUR_DEVICE_IP" with the actual IP address of your Philips Air Purifier', 'info');
  log('', 'info');
  log('After updating the configuration:', 'info');
  log('1. Save the config.json file', 'info');
  log('2. Restart Homebridge', 'info');
  log('3. The plugin should now work with the Python virtual environment', 'info');
}

function main() {
  log('Homebridge Philips Air Purifier Plugin - Configuration Helper');
  log('============================================================');

  // Check if virtual environment exists
  const venvPath = getVenvPythonPath();
  if (!fs.existsSync(venvPath)) {
    log('Python virtual environment not found. Please run the postinstall script first:', 'error');
    log('  npm run postinstall', 'error');
    return;
  }

  log(`Python virtual environment found at: ${venvPath}`);

  // Try to find and update existing Homebridge configuration
  const configPath = findHomebridgeConfig();
  if (configPath) {
    log(`Found Homebridge configuration at: ${configPath}`);

    // Backup the configuration
    const backupPath = backupConfig(configPath);

    if (backupPath) {
      // Update the configuration
      if (updateConfigWithPythonVenv(configPath)) {
        log('Configuration updated successfully!', 'info');
        log('Please restart Homebridge for changes to take effect.', 'info');
      }
    }
  } else {
    log('No Homebridge configuration found. Creating sample configuration...', 'warn');
    createSampleConfig();
  }

  log('', 'info');
  showConfigurationInstructions();
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  updateConfigWithPythonVenv,
  createSampleConfig,
  getVenvPythonPath,
  findHomebridgeConfig
};
