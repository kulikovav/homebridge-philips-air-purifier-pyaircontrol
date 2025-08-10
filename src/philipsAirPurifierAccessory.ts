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
}

// Type for Python script results
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

export class PhilipsAirPurifierAccessory {
  private service: Service;
  private fanService?: Service;
  private temperatureSensorService?: Service;
  private humiditySensorService?: Service;

  private pythonScriptPath: string;
  private consecutiveErrors: number = 0;
  private pollingIntervalId?: NodeJS.Timeout;

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  constructor(
    private readonly platform: PhilipsAirPurifierPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly deviceConfig: DeviceConfig,
  ) {
    this.platform.log.debug(`Initializing accessory for ${this.deviceConfig.name} at ${this.deviceConfig.ip}`);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Philips')
      .setCharacteristic(this.platform.Characteristic.Model, 'Air Purifier') // You might want to make this configurable
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceConfig.ip); // Using IP as serial for simplicity

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
      .onSet(this.setActive.bind(this)) // Map to Air Purifier Active
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


    // Get the plugin directory path - this is more reliable than process.cwd()
    const pluginDir = path.dirname(require.main?.filename || __dirname);
    this.pythonScriptPath = path.join(pluginDir, 'python_scripts');

    // Fallback: if the above doesn't work, try to find the scripts relative to the current file
    if (!fs.existsSync(this.pythonScriptPath)) {
      this.pythonScriptPath = path.join(__dirname, '..', 'python_scripts');
    }

    this.platform.log.debug(`Python scripts path: ${this.pythonScriptPath}`);

    // Poll for status updates
    this.pollingIntervalId = setInterval(() => {
      this.updateDeviceStatus();
    }, (this.deviceConfig.pollingInterval || 30) * 1000);
  }

  async runPythonScript(scriptName: string, args: string[] = [], retryCount: number = 0): Promise<PythonScriptResult> {
    const maxRetries = this.deviceConfig.maxRetries || 2; // Default 2 retries

    return new Promise<PythonScriptResult>((resolve, reject) => {
      // Use virtual environment Python if specified, otherwise fall back to system python3
      const pythonExecutable = this.deviceConfig.pythonVenvPath || 'python3';
      const pythonCommand = `${pythonExecutable} ${path.join(this.pythonScriptPath, scriptName)}.py`;
      const fullCommand = `${pythonCommand} ${this.deviceConfig.ip} ${this.deviceConfig.protocol || 'coap'} ${args.join(' ')}`;

      this.platform.log.debug(`Executing Python command: ${fullCommand}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);

      // Add timeout to prevent hanging
      const timeoutMs = this.deviceConfig.scriptTimeout || 30000; // Default 30 seconds
      const timeout = setTimeout(() => {
        this.platform.log.error(`Python script ${scriptName} timed out after ${timeoutMs / 1000} seconds`);
        reject(new Error(`Python script ${scriptName} timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);

      const childProcess = exec(fullCommand, (error: Error | null, stdout: string, stderr: string) => {
        clearTimeout(timeout); // Clear timeout since we got a response

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

      // Handle process exit to ensure cleanup
      childProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          this.platform.log.error(`Python script ${scriptName} exited with code ${code}`);
        }
      });

      // Handle process errors
      childProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.platform.log.error(`Python script ${scriptName} process error: ${this.getErrorMessage(error)}`);
        reject(new Error(`Python script process error: ${this.getErrorMessage(error)}`));
      });
    }).catch(async (error) => {
      // Retry logic for network-related errors
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        this.platform.log.warn(`Retrying ${scriptName} due to retryable error: ${this.getErrorMessage(error)}`);
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 1s, 2s, 4s, max 5s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.runPythonScript(scriptName, args, retryCount + 1);
      }
      throw error;
    });
  }

  /**
   * Determine if an error is retryable (network-related errors)
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();
    const retryablePatterns = [
      'give up on message',
      'timeout',
      'connection refused',
      'network is unreachable',
      'no route to host',
      'connection reset',
      'broken pipe',
      'econnreset',
      'enetunreach',
      'econnrefused'
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Re-enable polling if it was disabled due to errors
   */
  private reEnablePolling(): void {
    if (!this.pollingIntervalId && this.deviceConfig.disablePollingOnError) {
      this.platform.log.info(`Re-enabling polling for ${this.deviceConfig.name}`);
      this.pollingIntervalId = setInterval(() => {
        this.updateDeviceStatus();
      }, (this.deviceConfig.pollingInterval || 30) * 1000);
    }
  }

  async updateDeviceStatus() {
    try {
      this.platform.log.debug(`Polling device status for ${this.deviceConfig.name}...`);
      const status = await this.runPythonScript('get_status');
      this.platform.log.debug(`Received status for ${this.deviceConfig.name}: ${JSON.stringify(status)}`);

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
          case 'S': // Sleep Mode (often mapped to manual or auto depending on interpretation)
            targetState = this.platform.Characteristic.TargetAirPurifierState.MANUAL;
            break;
          default:
            targetState = this.platform.Characteristic.TargetAirPurifierState.AUTO; // Default to auto
        }
        this.service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, targetState);

        // Current Air Purifier State
        if (status.pwr === 1) {
          this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState,
            status.mode === 'A' ? this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR :
              this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR); // Always purifying if active
        } else {
          this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState,
            this.platform.Characteristic.CurrentAirPurifierState.INACTIVE);
        }
      }

      if (status.om !== undefined) { // 'om' is fan speed in manual mode or sleep speed
        // This mapping might need adjustment based on your device's fan speeds
        // For simplicity, let's map 'om' (0-3 or 's') to a percentage
        let rotationSpeed = 0;
        if (status.pwr === 1) { // Only set rotation speed if device is active
          if (status.mode === 'S') { // Sleep mode usually has a fixed, quiet speed
            rotationSpeed = 10; // Assign a small percentage for sleep mode
          } else if (typeof status.om === 'number') { // Manual speeds 1, 2, 3
            // Assuming max manual speed is 3. Adjust if your device has more speeds.
            rotationSpeed = (status.om / 3) * 100;
          } else if (status.mode === 'A') {
            // In auto mode, 'om' might indicate current actual fan speed or be 0.
            // If it's 0, it means the device is in auto but not actively fanning,
            // or if it's a number, it represents current auto-adjusted speed.
            // Let's map it similarly, assuming max auto speed is also 3.
            if (typeof status.om === 'number') {
              rotationSpeed = (status.om / 3) * 100;
            } else {
              rotationSpeed = 50; // Default to a medium speed for auto if `om` isn't numeric
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
      // Consider adding TVOC, CO2, etc. if available and relevant

      // Filter Change Indication and Filter Life Level
      if (status.fltsts0 !== undefined) { // Pre-filter and active carbon filter life
        const filterLife = Math.max(0, Math.min(100, Math.round((status.fltsts0 / 180) * 100))); // Assuming 180 days life for now
        this.service.updateCharacteristic(this.platform.Characteristic.FilterLifeLevel, filterLife);
        const filterChangeRequired = (filterLife < 10) ? this.platform.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.platform.Characteristic.FilterChangeIndication.FILTER_OK;
        this.service.updateCharacteristic(this.platform.Characteristic.FilterChangeIndication, filterChangeRequired);
      }
      if (status.fltsts1 !== undefined) { // HEPA filter life
        // HomeKit only has one filter life, so we might need to combine or pick the lowest
        // For simplicity, let's just use fltsts0 for now as it seems more common.
        // Or you could create custom services for other filters if needed.
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
        // Re-enable polling if it was disabled
        this.reEnablePolling();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? this.getErrorMessage(error) : String(error);
      this.platform.log.error(`Failed to update device status for ${this.deviceConfig.name}:`, errorMessage);

      // Track consecutive errors
      this.consecutiveErrors++;

      // Check if we should disable polling to prevent spam
      if (this.deviceConfig.disablePollingOnError && this.consecutiveErrors >= 3 && this.pollingIntervalId) {
        this.platform.log.warn(`Disabling polling for ${this.deviceConfig.name} after ${this.consecutiveErrors} consecutive errors`);
        clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = undefined;
      }

      // Set characteristics to safe default values on error to prevent Homebridge from hanging
      // This ensures the plugin remains responsive even when the device is unreachable
      try {
        this.service.updateCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.INACTIVE);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, this.platform.Characteristic.CurrentAirPurifierState.INACTIVE);
        this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, 0);

        if (this.fanService) {
          this.fanService.updateCharacteristic(this.platform.Characteristic.On, false);
          this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, 0);
        }

        // Set filter to OK state to prevent false alerts
        this.service.updateCharacteristic(this.platform.Characteristic.FilterChangeIndication, this.platform.Characteristic.FilterChangeIndication.FILTER_OK);
        this.service.updateCharacteristic(this.platform.Characteristic.FilterLifeLevel, 100);

        // Set default sensor values
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

  /**
   * Handle requests to set the "Active" characteristic
   */
  async setActive(value: CharacteristicValue) {
    const desiredPowerState = value === this.platform.Characteristic.Active.ACTIVE ? 1 : 0;
    try {
      this.platform.log.debug(`Setting Active characteristic for ${this.deviceConfig.name} to ${value}`);
      await this.runPythonScript('set_value', ['pwr', String(desiredPowerState)]);
      this.platform.log.debug('Set Active successfully');
    } catch (error) {
      this.platform.log.error(`Failed to set Active for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      // Throw error to HomeKit to indicate failure
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Handle requests to get the "Active" characteristic
   */
  async getActive(): Promise<CharacteristicValue> {
    try {
      this.platform.log.debug(`Getting Active characteristic for ${this.deviceConfig.name}`);
      const status = await this.runPythonScript('get_status');
      const isActive = status.pwr === 1 ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
      this.platform.log.debug(`Get Active result for ${this.deviceConfig.name}: ${isActive}`);
      return isActive;
    } catch (error) {
      this.platform.log.error(`Failed to get Active for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      // Return inactive state on error or timeout to prevent Homebridge from hanging
      return this.platform.Characteristic.Active.INACTIVE;
    }
  }

  /**
   * Handle requests to get the "Current Air Purifier State" characteristic
   */
  async getCurrentAirPurifierState(): Promise<CharacteristicValue> {
    try {
      const status = await this.runPythonScript('get_status');
      if (status.pwr === 1) {
        return this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
      } else {
        return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
      }
    } catch (error) {
      this.platform.log.error(`Failed to get Current Air Purifier State for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
    }
  }

  /**
   * Handle requests to set the "Target Air Purifier State" characteristic
   */
  async setTargetAirPurifierState(value: CharacteristicValue) {
    try {
      this.platform.log.debug(`Setting Target Air Purifier State for ${this.deviceConfig.name} to ${value}`);
      // Map HomeKit states to device modes
      let mode;
      if (value === this.platform.Characteristic.TargetAirPurifierState.AUTO) {
        mode = 'A';
      } else {
        mode = 'M'; // Manual mode
      }
      await this.runPythonScript('set_value', ['mode', mode]);
      this.platform.log.debug('Set Target Air Purifier State successfully');
    } catch (error) {
      this.platform.log.error(`Failed to set Target Air Purifier State for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Handle requests to get the "Target Air Purifier State" characteristic
   */
  async getTargetAirPurifierState(): Promise<CharacteristicValue> {
    try {
      const status = await this.runPythonScript('get_status');
      if (status.mode === 'A') {
        return this.platform.Characteristic.TargetAirPurifierState.AUTO;
      } else {
        return this.platform.Characteristic.TargetAirPurifierState.MANUAL;
      }
    } catch (error) {
      this.platform.log.error(`Failed to get Target Air Purifier State for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return this.platform.Characteristic.TargetAirPurifierState.AUTO;
    }
  }

  /**
   * Handle requests to set the "Rotation Speed" characteristic
   */
  async setRotationSpeed(value: CharacteristicValue) {
    try {
      this.platform.log.debug(`Setting Rotation Speed for ${this.deviceConfig.name} to ${value}`);
      // Convert percentage to device fan speed (1-3)
      const speed = Math.max(1, Math.min(3, Math.ceil((value as number) / 33.33)));
      await this.runPythonScript('set_value', ['om', String(speed)]);
      this.platform.log.debug('Set Rotation Speed successfully');
    } catch (error) {
      this.platform.log.error(`Failed to set Rotation Speed for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Handle requests to get the "Rotation Speed" characteristic
   */
  async getRotationSpeed(): Promise<CharacteristicValue> {
    try {
      const status = await this.runPythonScript('get_status');
      if (status.pwr === 1 && status.om !== undefined) {
        if (status.mode === 'S') {
          return 10; // Sleep mode - low speed
        } else if (typeof status.om === 'number') {
          return Math.round((status.om / 3) * 100);
        }
      }
      return 0;
    } catch (error) {
      this.platform.log.error(`Failed to get Rotation Speed for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 0;
    }
  }

  /**
   * Handle requests to get the "Current Temperature" characteristic
   */
  async getCurrentTemperature(): Promise<CharacteristicValue> {
    try {
      const status = await this.runPythonScript('get_status');
      if (status.temp !== undefined) {
        return status.temp;
      }
      return 20; // Default temperature if not available
    } catch (error) {
      this.platform.log.error(`Failed to get Current Temperature for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 20;
    }
  }

  /**
   * Handle requests to get the "Current Relative Humidity" characteristic
   */
  async getCurrentHumidity(): Promise<CharacteristicValue> {
    try {
      const status = await this.runPythonScript('get_status');
      if (status.rh !== undefined) {
        return status.rh;
      }
      return 50; // Default humidity if not available
    } catch (error) {
      this.platform.log.error(`Failed to get Current Relative Humidity for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 50;
    }
  }



  /**
   * Handle requests to get the "PM2.5 Density" characteristic
   */
  async getPM25Density(): Promise<CharacteristicValue> {
    try {
      const status = await this.runPythonScript('get_status');
      if (status.pm25 !== undefined) {
        return status.pm25;
      }
      return 0; // Default if not available
    } catch (error) {
      this.platform.log.error(`Failed to get PM2.5 Density for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 0;
    }
  }

  /**
   * Handle requests to get the "Filter Life Level" characteristic
   */
  async getFilterLifeLevel(): Promise<CharacteristicValue> {
    try {
      const status = await this.runPythonScript('get_status');
      if (status.fltsts0 !== undefined) {
        const filterLife = Math.max(0, Math.min(100, Math.round((status.fltsts0 / 180) * 100)));
        return filterLife;
      }
      return 0; // Default if not available
    } catch (error) {
      this.platform.log.error(`Failed to get Filter Life Level for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return 0;
    }
  }

  /**
   * Handle requests to get the "Filter Change Indication" characteristic
   */
  async getFilterChangeIndication(): Promise<CharacteristicValue> {
    try {
      const status = await this.runPythonScript('get_status');
      if (status.fltsts0 !== undefined) {
        const filterLife = Math.max(0, Math.min(100, Math.round((status.fltsts0 / 180) * 100)));
        const filterChangeRequired = (filterLife < 10) ? this.platform.Characteristic.FilterChangeIndication.CHANGE_FILTER : this.platform.Characteristic.FilterChangeIndication.FILTER_OK;
        return filterChangeRequired;
      }
      return this.platform.Characteristic.FilterChangeIndication.FILTER_OK; // Default if not available
    } catch (error) {
      this.platform.log.error(`Failed to get Filter Change Indication for ${this.deviceConfig.name}:`, this.getErrorMessage(error));
      return this.platform.Characteristic.FilterChangeIndication.FILTER_OK;
    }
  }
}
