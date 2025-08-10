import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { PhilipsAirPurifierAccessory } from './philipsAirPurifierAccessory';
import { PhilipsAirPurifierAccessoryEnhanced } from './philipsAirPurifierAccessoryEnhanced';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, where you should
 * register the platform and discover devices.
 */
export class PhilipsAirPurifierPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // otherwise things can get messy.
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when Homebridge restores cached accessories from disk at startup.
   * It should be used to setup the accessory and re-expose it to Homebridge.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track it
    this.accessories.push(accessory);
  }

  /**
   * This is an example of how the platform dispatches the user configured devices.
   * In this example, the user has configured an array of devices and each of them
   * will be added as a separate accessory.
   */
  discoverDevices() {

    // loop over the configured devices and register each to Homebridge
    for (const deviceConfig of this.config.devices) {

      // generate a unique id for the accessory this should be generated from
      // the device unique id, i.e. the serial number, IP address, device family, etc.
      const uuid = this.api.hap.uuid.generate(deviceConfig.ip);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached accessories list contents of the `configureAccessory` method
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        if (deviceConfig.name) {
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          // if you want to update the accessory.context then you should delete the old
          // application data and re-register the accessory here.
          // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
          // this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          // use enhanced version if enabled, otherwise fall back to original
          if (deviceConfig.useEnhancedPolling !== false) { // Default to true
            new PhilipsAirPurifierAccessoryEnhanced(this, existingAccessory, deviceConfig);
          } else {
            new PhilipsAirPurifierAccessory(this, existingAccessory, deviceConfig);
          }

          // update accessory cache with any changes to the device details
          this.api.updatePlatformAccessories([existingAccessory]);
        }
      } else {
        // the accessory does not yet exist, pass through the device config
        this.log.info('Adding new accessory:', deviceConfig.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(deviceConfig.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you
        // need to restore it in `configureAccessory` and subsequently update it.
        accessory.context.device = deviceConfig;

        // create the accessory handler for the newly create accessory
        // use enhanced version if enabled, otherwise fall back to original
        if (deviceConfig.useEnhancedPolling !== false) { // Default to true
          new PhilipsAirPurifierAccessoryEnhanced(this, accessory, deviceConfig);
        } else {
          new PhilipsAirPurifierAccessory(this, accessory, deviceConfig);
        }

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}