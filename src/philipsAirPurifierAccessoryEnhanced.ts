import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { PhilipsAirPurifierPlatform } from './philipsAirPurifierPlatform';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

interface DeviceConfig {
  name: string;
  ip: string;
  protocol?: string;
  pollingInterval?: number;
  pythonVenvPath?: string;
  scriptTimeout?: number; // Timeout in milliseconds for Python script execution
  maxRetries?: number; // Maximum number of retries for network-related errors
  disablePollingOnError?: boolean; // Disable polling when device is unreachable
  useEnhancedPolling?: boolean; // Use the enhanced polling manager
}

// Enhanced type for Python script results with polling manager
type EnhancedPythonScriptResult = {
  success?: boolean;
  status_data?: {
    pwr?: number;
    mode?: string;
    om?: number | string;
    pm25?: number;
    fltsts0?: number;
    fltsts1?: number;
    temp?: number;
    rh?: number;
    iaql?: number;
  };
  is_connected?: boolean;
  last_update?: number;
  error_count?: number;
  error?: string;
  message?: string;
};

// Fallback to original type for backward compatibility
type PythonScriptResult = {
  pwr?: number;
  mode?: string;
  om?: number | string;
  pm25?: number;
  fltsts0?: number;
  fltsts1?: number;
  temp?: number;
  rh?: number;
  iaql?: number;
  error?: string;
  success?: boolean;
};

export class PhilipsAirPurifierAccessoryEnhanced {
  private service: Service;
  private fanService?: Service;
  private temperatureSensorService?: Service;
  private humiditySensorService?: Service;

  private pythonScriptPath: string;
  private consecutiveErrors: number = 0;
  private pollingIntervalId?: ReturnType<typeof setInterval>;
  private useEnhancedPolling: boolean;
  private deviceId: string;

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  constructor(
    private readonly platform: PhilipsAirPurifierPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly deviceConfig: DeviceConfig,
  ) {
    this.platform.log.debug(`Initializing enhanced accessory for ${this.deviceConfig.name} at ${this.deviceConfig.ip}`);

    // Generate a unique device ID for the polling manager
    this.deviceId = `device_${this.deviceConfig.ip.replace(/\./g, '_')}`;

    // Check if enhanced polling should be used
    this.useEnhancedPolling = this.deviceConfig.useEnhancedPolling !== false; // Default to true

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Philips')
      .setCharacteristic(this.platform.Characteristic.Model, 'Air Purifier')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceConfig.ip);

    this.service = this.accessory.getService(this.platform.Service.AirPurifier) || this.accessory.addService(this.platform.Service.AirPurifier);
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.deviceConfig.name);

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
      .onGet(this.getCurrentAirPurifierState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
      .onSet(this.setTargetAirPurifierState.bind(this))
      .onGet(this.getTargetAirPurifierState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setRotationSpeed.bind(this))
      .onGet(this.getRotationSpeed.bind(this));

    // Add Air Quality characteristics
    this.service.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.getPM25Density.bind(this));

    // Add Filter characteristics
    this.service.getCharacteristic(this.platform.Characteristic.FilterLifeLevel)
      .onGet(this.getFilterLifeLevel.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.FilterChangeIndication)
      .onGet(this.getFilterChangeIndication.bind(this));

    // Optional: Fan Service for more granular fan control
    this.fanService = this.accessory.getService(this.platform.Service.Fan) || this.accessory.addService(this.platform.Service.Fan);
    this.fanService.setCharacteristic(this.platform.Characteristic.Name, `${this.deviceConfig.name} Fan`);
    this.fanService.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));
    this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setRotationSpeed.bind(this))
      .onGet(this.getRotationSpeed.bind(this));

    // Optional: Temperature Sensor Service
    this.temperatureSensorService = this.accessory.getService(this.platform.Service.TemperatureSensor) || this.accessory.addService(this.platform.Service.TemperatureSensor);
    this.temperatureSensorService.setCharacteristic(this.platform.Characteristic.Name, `${this.deviceConfig.name} Temperature`);
    this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    // Optional: Humidity Sensor Service
    this.humiditySensorService = this.accessory.getService(this.platform.Service.HumiditySensor) || this.accessory.addService(this.platform.Service.HumiditySensor);
    this.humiditySensorService.setCharacteristic(this.platform.Characteristic.Name, `${this.deviceConfig.name} Humidity`);
    this.humiditySensorService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getCurrentHumidity.bind(this));

    // Get the plugin directory path
    const pluginDir = path.dirname(require.main?.filename || __dirname);
    this.pythonScriptPath = path.join(pluginDir, 'python_scripts');

    // Fallback: if the above doesn't work, try to find the scripts relative to the current file
    if (!fs.existsSync(this.pythonScriptPath)) {
      this.pythonScriptPath = path.join(__dirname, '..', 'python_scripts');
    }

    this.platform.log.debug(`Python scripts path: ${this.pythonScriptPath}`);
    this.platform.log.info(`Using ${this.useEnhancedPolling ? 'enhanced' : 'standard'} polling for ${this.deviceConfig.name}`);

    // Start polling
    this.startPolling();
  }

  private startPolling(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
    }

    this.pollingIntervalId = setInterval(() => {
      this.updateDeviceStatus();
    }, (this.deviceConfig.pollingInterval || 30) * 1000);

    // Initial status update
    this.updateDeviceStatus();
  }

           private async runEnhancedPythonScript(command: string, args: string[] = []): Promise<EnhancedPythonScriptResult> {

    return new Promise<EnhancedPythonScriptResult>((resolve, reject) => {
      const pythonExecutable = this.deviceConfig.pythonVenvPath || 'python3';
      const pythonCommand = `${pythonExecutable} ${path.join(this.pythonScriptPath, 'plugin_polling_interface.py')}`;
      const fullCommand = `${pythonCommand} ${command} ${this.deviceId} ${args.join(' ')}`;

      this.platform.log.debug(`Executing enhanced Python command: ${fullCommand}`);

      const timeoutMs = this.deviceConfig.scriptTimeout || 30000;
      const timeout = setTimeout(() => {
        this.platform.log.error(`Enhanced Python script ${command} timed out after ${timeoutMs / 1000} seconds`);
        reject(new Error(`Enhanced Python script ${command} timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);

      const childProcess = exec(fullCommand, (error: Error | null, stdout: string, stderr: string) => {
        clearTimeout(timeout);

        if (error) {
          this.platform.log.error(`Enhanced Python script error for ${command}: ${this.getErrorMessage(error)}`);
          this.platform.log.error(`Stderr: ${stderr}`);
          return reject(new Error(`Enhanced Python script failed: ${stderr || this.getErrorMessage(error)}`));
        }

        if (stderr) {
          this.platform.log.warn(`Enhanced Python script warnings/errors for ${command}: ${stderr}`);
        }

        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            this.platform.log.error(`Enhanced Python script reported error: ${result.error}`);
            return reject(new Error(result.error));
          }
          resolve(result);
        } catch (parseError) {
          this.platform.log.error(`Failed to parse JSON from enhanced Python script ${command}: ${stdout}`);
          reject(new Error(`Failed to parse JSON: ${this.getErrorMessage(parseError)}`));
        }
      });

      childProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          this.platform.log.error(`Enhanced Python script ${command} exited with code ${code}`);
        }
      });

      childProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.platform.log.error(`Enhanced Python script ${command} process error: ${this.getErrorMessage(error)}`);
        reject(new Error(`Enhanced Python script process error: ${this.getErrorMessage(error)}`));
      });
    }).catch(async (error) => {
      // Retry logic for network-related errors
      if (this.isRetryableError(error)) {
        this.platform.log.warn(`Retrying enhanced ${command} due to retryable error: ${this.getErrorMessage(error)}`);
        const delay = Math.min(1000 * Math.pow(2, 0), 5000); // Simple retry with 1s delay
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.runEnhancedPythonScript(command, args);
      }
      throw error;
    });
  }

  private async runPythonScript(scriptName: string, args: string[] = [], retryCount: number = 0): Promise<PythonScriptResult> {
    const maxRetries = this.deviceConfig.maxRetries || 2;

    return new Promise<PythonScriptResult>((resolve, reject) => {
      const pythonExecutable = this.deviceConfig.pythonVenvPath || 'python3';
      const pythonCommand = `${pythonExecutable} ${path.join(this.pythonScriptPath, scriptName)}.py`;
      const fullCommand = `${pythonCommand} ${this.deviceConfig.ip} ${this.deviceConfig.protocol || 'coap'} ${args.join(' ')}`;

      this.platform.log.debug(`Executing Python command: ${fullCommand}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);

      const timeoutMs = this.deviceConfig.scriptTimeout || 30000;
      const timeout = setTimeout(() => {
        this.platform.log.error(`Python script ${scriptName} timed out after ${timeoutMs / 1000} seconds`);
        reject(new Error(`Python script ${scriptName} timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);

      const childProcess = exec(fullCommand, (error: Error | null, stdout: string, stderr: string) => {
        clearTimeout(timeout);

        if (error) {
          this.platform.log.error(`Python script error for ${scriptName}: ${this.getErrorMessage(error)}`);
          this.platform.log.error(`Stderr: ${stderr}`);
          return reject(new Error(`Python script failed: ${stderr || this.getErrorMessage(error)}`));
        }

        if (stderr) {
          this.platform.log.warn(`Python script warnings/errors for ${scriptName}: ${stderr}`);
        }

        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            this.platform.log.error(`Python script reported error: ${result.error}`);
            return reject(new Error(result.error));
          }
          resolve(result);
        } catch (parseError) {
          this.platform.log.error(`Failed to parse JSON from Python script ${scriptName}: ${stdout}`);
          reject(new Error(`Failed to parse JSON: ${this.getErrorMessage(parseError)}`));
        }
      });

      childProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          this.platform.log.error(`Python script ${scriptName} exited with code ${code}`);
        }
      });

      childProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.platform.log.error(`Python script ${scriptName} process error: ${this.getErrorMessage(error)}`);
        reject(new Error(`Python script process error: ${this.getErrorMessage(error)}`));
      });
    }).catch(async (error) => {
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        this.platform.log.warn(`Retrying ${scriptName} due to retryable error: ${this.getErrorMessage(error)}`);
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.runPythonScript(scriptName, args, retryCount + 1);
      }
      throw error;
    });
  }

  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('timeout') ||
           errorMessage.includes('connection') ||
           errorMessage.includes('network') ||
           errorMessage.includes('econnrefused') ||
           errorMessage.includes('enotfound');
  }

  private reEnablePolling(): void {
    if (!this.pollingIntervalId && this.deviceConfig.disablePollingOnError) {
      this.platform.log.info(`Re-enabling polling for ${this.deviceConfig.name}`);
      this.startPolling();
    }
  }

  async updateDeviceStatus() {
    try {
      this.platform.log.debug(`Polling device status for ${this.deviceConfig.name}...`);

      let status: any;

      if (this.useEnhancedPolling) {
        // Use enhanced polling interface
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683', // Default port
          'false' // Don't force poll on regular updates
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
          this.platform.log.debug(`Enhanced polling status for ${this.deviceConfig.name}: ${JSON.stringify(status)}`);
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        // Fallback to original method
        status = await this.runPythonScript('get_status');
        this.platform.log.debug(`Standard polling status for ${this.deviceConfig.name}: ${JSON.stringify(status)}`);
      }

      // Update HomeKit characteristics based on status
      if (status.pwr !== undefined) {
        const isActive = status.pwr === 1 ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
        this.service.updateCharacteristic(this.platform.Characteristic.Active, isActive);
        if (this.fanService) {
          this.fanService.updateCharacteristic(this.platform.Characteristic.On, status.pwr === 1);
        }
      }

      if (status.mode !== undefined) {
        let targetState;
        switch (status.mode) {
          case 'A': // Auto Mode
            targetState = this.platform.Characteristic.TargetAirPurifierState.AUTO;
            break;
          case 'M': // Manual Mode
          case 'S': // Sleep Mode
            targetState = this.platform.Characteristic.TargetAirPurifierState.MANUAL;
            break;
          default:
            targetState = this.platform.Characteristic.TargetAirPurifierState.AUTO;
        }
        this.service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, targetState);

        // Current Air Purifier State
        if (status.pwr === 1) {
          this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState,
            status.mode === 'A' ? this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR :
              this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        } else {
          this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState,
            this.platform.Characteristic.CurrentAirPurifierState.INACTIVE);
        }
      }

      if (status.om !== undefined) {
        let rotationSpeed = 0;
        if (status.pwr === 1) {
          if (status.mode === 'S') {
            rotationSpeed = 10;
          } else if (typeof status.om === 'number') {
            rotationSpeed = (status.om / 3) * 100;
          } else if (status.mode === 'A') {
            if (typeof status.om === 'number') {
              rotationSpeed = (status.om / 3) * 100;
            } else {
              rotationSpeed = 50;
            }
          }
        }
        this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, rotationSpeed);
        if (this.fanService) {
          this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, rotationSpeed);
        }
      }

      // PM2.5 Density
      if (status.pm25 !== undefined) {
        this.service.updateCharacteristic(this.platform.Characteristic.PM2_5Density, status.pm25);
      }

      // Filter Change Indication and Filter Life Level
      if (status.fltsts0 !== undefined) {
        const filterLife = Math.max(0, Math.min(100, Math.round((status.fltsts0 / 180) * 100)));
        this.service.updateCharacteristic(this.platform.Characteristic.FilterLifeLevel, filterLife);
        const filterChangeRequired = (filterLife < 10) ? this.platform.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.platform.Characteristic.FilterChangeIndication.FILTER_OK;
        this.service.updateCharacteristic(this.platform.Characteristic.FilterChangeIndication, filterChangeRequired);
      }

      // Temperature Sensor
      if (this.temperatureSensorService && status.temp !== undefined) {
        this.temperatureSensorService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, status.temp);
      }

      // Humidity Sensor
      if (this.humiditySensorService && status.rh !== undefined) {
        this.humiditySensorService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, status.rh);
      }

      // Reset consecutive error counter on successful communication
      if (this.consecutiveErrors > 0) {
        this.platform.log.debug(`Reset consecutive error counter for ${this.deviceConfig.name} after successful communication`);
        this.consecutiveErrors = 0;
        this.reEnablePolling();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? this.getErrorMessage(error) : String(error);
      this.platform.log.error(`Failed to update device status for ${this.deviceConfig.name}:`, errorMessage);

      this.consecutiveErrors++;

      if (this.deviceConfig.disablePollingOnError && this.consecutiveErrors >= 3 && this.pollingIntervalId) {
        this.platform.log.warn(`Disabling polling for ${this.deviceConfig.name} after ${this.consecutiveErrors} consecutive errors`);
        clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = undefined;
      }

      // Set characteristics to safe default values on error
      try {
        this.service.updateCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.INACTIVE);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, this.platform.Characteristic.CurrentAirPurifierState.INACTIVE);
        this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, 0);

        if (this.fanService) {
          this.fanService.updateCharacteristic(this.platform.Characteristic.On, false);
          this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, 0);
        }

        this.service.updateCharacteristic(this.platform.Characteristic.FilterChangeIndication, this.platform.Characteristic.FilterChangeIndication.FILTER_OK);
        this.service.updateCharacteristic(this.platform.Characteristic.FilterLifeLevel, 100);

        if (this.temperatureSensorService) {
          this.temperatureSensorService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, 20);
        }
        if (this.humiditySensorService) {
          this.humiditySensorService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, 50);
        }

        this.platform.log.debug(`Set safe default values for ${this.deviceConfig.name} due to communication error`);
      } catch (updateError) {
        this.platform.log.error(`Failed to set safe default values for ${this.deviceConfig.name}:`, this.getErrorMessage(updateError));
      }
    }
  }

  async setActive(value: CharacteristicValue) {
    const desiredPowerState = value === this.platform.Characteristic.Active.ACTIVE ? 1 : 0;
    try {
      this.platform.log.debug(`Setting Active characteristic for ${this.deviceConfig.name} to ${value}`);

      if (this.useEnhancedPolling) {
        await this.runEnhancedPythonScript('set', [
          this.deviceConfig.ip,
          'pwr',
          String(desiredPowerState),
          this.deviceConfig.protocol || 'coaps',
          '5683'
        ]);
      } else {
        await this.runPythonScript('set_value', ['pwr', String(desiredPowerState)]);
      }

      this.platform.log.debug('Set Active successfully');
    } catch (error) {
      this.platform.log.error(`Failed to set Active for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getActive(): Promise<CharacteristicValue> {
    try {
      this.platform.log.debug(`Getting Active characteristic for ${this.deviceConfig.name}`);

      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'true' // Force poll to get fresh data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      const isActive = status.pwr === 1 ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
      this.platform.log.debug(`Get Active result for ${this.deviceConfig.name}: ${isActive}`);
      return isActive;
    } catch (error) {
      this.platform.log.error(`Failed to get Active for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return this.platform.Characteristic.Active.INACTIVE;
    }
  }

  async getCurrentAirPurifierState(): Promise<CharacteristicValue> {
    try {
      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'false' // Use cached data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      if (status.pwr === 1) {
        return status.mode === 'A' ? this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR :
          this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
      } else {
        return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
      }
    } catch (error) {
      this.platform.log.error(`Failed to get Current Air Purifier State for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
    }
  }

  async setTargetAirPurifierState(value: CharacteristicValue) {
    try {
      this.platform.log.debug(`Setting Target Air Purifier State for ${this.deviceConfig.name} to ${value}`);

      let modeValue: string;
      switch (value) {
        case this.platform.Characteristic.TargetAirPurifierState.AUTO:
          modeValue = 'A';
          break;
        case this.platform.Characteristic.TargetAirPurifierState.MANUAL:
          modeValue = 'M';
          break;
        default:
          modeValue = 'A';
      }

      if (this.useEnhancedPolling) {
        await this.runEnhancedPythonScript('set', [
          this.deviceConfig.ip,
          'mode',
          modeValue,
          this.deviceConfig.protocol || 'coaps',
          '5683'
        ]);
      } else {
        await this.runPythonScript('set_value', ['mode', modeValue]);
      }

      this.platform.log.debug('Set Target Air Purifier State successfully');
    } catch (error) {
      this.platform.log.error(`Failed to set Target Air Purifier State for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getTargetAirPurifierState(): Promise<CharacteristicValue> {
    try {
      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'false' // Use cached data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      switch (status.mode) {
        case 'A':
          return this.platform.Characteristic.TargetAirPurifierState.AUTO;
        case 'M':
        case 'S':
          return this.platform.Characteristic.TargetAirPurifierState.MANUAL;
        default:
          return this.platform.Characteristic.TargetAirPurifierState.AUTO;
      }
    } catch (error) {
      this.platform.log.error(`Failed to get Target Air Purifier State for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return this.platform.Characteristic.TargetAirPurifierState.AUTO;
    }
  }

  async setRotationSpeed(value: CharacteristicValue) {
    try {
      this.platform.log.debug(`Setting Rotation Speed for ${this.deviceConfig.name} to ${value}`);

      // Convert percentage to device-specific values (1-3)
      const speedValue = Math.max(1, Math.min(3, Math.round((Number(value) / 100) * 3)));

      if (this.useEnhancedPolling) {
        await this.runEnhancedPythonScript('set', [
          this.deviceConfig.ip,
          'om',
          String(speedValue),
          this.deviceConfig.protocol || 'coaps',
          '5683'
        ]);
      } else {
        await this.runPythonScript('set_value', ['om', String(speedValue)]);
      }

      this.platform.log.debug('Set Rotation Speed successfully');
    } catch (error) {
      this.platform.log.error(`Failed to set Rotation Speed for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    try {
      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'false' // Use cached data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      if (status.pwr === 1 && typeof status.om === 'number') {
        return (status.om / 3) * 100;
      }
      return 0;
    } catch (error) {
      this.platform.log.error(`Failed to get Rotation Speed for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 0;
    }
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    try {
      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'false' // Use cached data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      return status.temp !== undefined ? status.temp : 20;
    } catch (error) {
      this.platform.log.error(`Failed to get Current Temperature for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 20;
    }
  }

  async getCurrentHumidity(): Promise<CharacteristicValue> {
    try {
      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'false' // Use cached data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      return status.rh !== undefined ? status.rh : 50;
    } catch (error) {
      this.platform.log.error(`Failed to get Current Humidity for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 50;
    }
  }

  async getPM25Density(): Promise<CharacteristicValue> {
    try {
      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'false' // Use cached data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      return status.pm25 !== undefined ? status.pm25 : 0;
    } catch (error) {
      this.platform.log.error(`Failed to get PM2.5 Density for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 0;
    }
  }

  async getFilterLifeLevel(): Promise<CharacteristicValue> {
    try {
      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'false' // Use cached data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      if (status.fltsts0 !== undefined) {
        return Math.max(0, Math.min(100, Math.round((status.fltsts0 / 180) * 100)));
      }
      return 100;
    } catch (error) {
      this.platform.log.error(`Failed to get Filter Life Level for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 100;
    }
  }

  async getFilterChangeIndication(): Promise<CharacteristicValue> {
    try {
      let status: any;

      if (this.useEnhancedPolling) {
        const result = await this.runEnhancedPythonScript('status', [
          this.deviceConfig.ip,
          this.deviceConfig.protocol || 'coaps',
          '5683',
          'false' // Use cached data
        ]);

        if (result.success && result.status_data) {
          status = result.status_data;
        } else {
          throw new Error(result.error || 'Enhanced polling failed');
        }
      } else {
        status = await this.runPythonScript('get_status');
      }

      if (status.fltsts0 !== undefined) {
        const filterLife = Math.max(0, Math.min(100, Math.round((status.fltsts0 / 180) * 100)));
        return (filterLife < 10) ? this.platform.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.platform.Characteristic.FilterChangeIndication.FILTER_OK;
      }
      return this.platform.Characteristic.FilterChangeIndication.FILTER_OK;
    } catch (error) {
      this.platform.log.error(`Failed to get Filter Change Indication for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return this.platform.Characteristic.FilterChangeIndication.FILTER_OK;
    }
  }

  // Cleanup method to be called when the accessory is destroyed
  destroy(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = undefined;
    }
  }
}
