#!/usr/bin/env node
/**
 * Postinstall script for Homebridge Philips Air Purifier Plugin
 * This script automatically sets up the Python virtual environment
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PYTHON_SCRIPTS_DIR = path.join(PLUGIN_ROOT, 'python_scripts');

function log(message) {
  console.log(`[Postinstall] ${message}`);
}

function isWindows() {
  return os.platform() === 'win32';
}

function isUnix() {
  return os.platform() === 'linux' || os.platform() === 'darwin';
}

function checkPythonAvailability() {
  try {
    const pythonCommand = isWindows() ? 'python' : 'python3';
    execSync(`${pythonCommand} --version`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function runSetupScript() {
  const scriptName = isWindows() ? 'setup_venv.bat' : 'setup_venv.sh';
  const scriptPath = path.join(PYTHON_SCRIPTS_DIR, scriptName);

  if (!fs.existsSync(scriptPath)) {
    log(`Setup script not found: ${scriptPath}`);
    return false;
  }

  try {
    if (isWindows()) {
      // On Windows, use cmd to run the batch file
      execSync(`cmd /c "${scriptPath}"`, {
        cwd: PYTHON_SCRIPTS_DIR,
        stdio: 'inherit'
      });
    } else {
      // On Unix-like systems, make the script executable and run it
      fs.chmodSync(scriptPath, '755');
      execSync(`bash "${scriptPath}"`, {
        cwd: PYTHON_SCRIPTS_DIR,
        stdio: 'inherit'
      });
    }
    return true;
  } catch (error) {
    log(`Failed to run setup script: ${error.message}`);
    return false;
  }
}

function getVenvPythonPath() {
  if (isWindows()) {
    return path.join(PLUGIN_ROOT, 'python_venv', 'Scripts', 'python.exe');
  }
  return path.join(PLUGIN_ROOT, 'python_venv', 'bin', 'python');
}

function main() {
  log('Starting postinstall setup for Homebridge Philips Air Purifier Plugin...');

  // Check if Python is available
  if (!checkPythonAvailability()) {
    log('Python is not available. Please install Python 3.6 or higher and run:');
    log('  npm run postinstall');
    log('Or manually set up the virtual environment using the scripts in python_scripts/');
    return;
  }

  log('Python found, setting up virtual environment...');

  // Run the appropriate setup script
  if (runSetupScript()) {
    const venvPythonPath = getVenvPythonPath();
    log('Virtual environment setup completed successfully!');
    log(`Python executable available at: ${venvPythonPath}`);
    log('');

    // Automatically update configuration
    log('Automatically updating Homebridge configuration...');
    try {
      const configHelper = require('./config-helper');
      if (configHelper.updateConfigWithPythonVenv) {
        const configPath = configHelper.findHomebridgeConfig();
        if (configPath) {
          if (configHelper.updateConfigWithPythonVenv(configPath)) {
            log('✅ Configuration automatically updated with pythonVenvPath!');
            log('Please restart Homebridge for changes to take effect.');
          } else {
            log('ℹ️ Configuration already has pythonVenvPath or plugin not configured yet.');
          }
        } else {
          log('⚠️ No Homebridge configuration found. Creating sample configuration...');
          configHelper.createSampleConfig();
        }
      }
    } catch (error) {
      log(`Configuration helper error: ${error.message}`, 'warn');
      log('You can manually update your configuration or run: npm run config:help');
    }

    log('');
    log('Configuration options:');
    log('• Run "npm run config:help" for configuration assistance');
    log('• Run "npm run config:update" to update existing configuration');
    log('• Run "npm run config:sample" to create sample configuration');
    log('');
    log('Note: You can also run the setup manually anytime using:');
    if (isWindows()) {
      log('  cd python_scripts && setup_venv.bat');
    } else {
      log('  cd python_scripts && bash setup_venv.sh');
    }
  } else {
    log('Virtual environment setup failed. Please check the error messages above.');
    log('You can try running the setup manually:');
    if (isWindows()) {
      log('  cd python_scripts && setup_venv.bat');
    } else {
      log('  cd python_scripts && bash setup_venv.sh');
    }
  }
}

// Run the main function
main();
