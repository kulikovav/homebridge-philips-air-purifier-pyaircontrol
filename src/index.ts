import { API } from 'homebridge';

import { PhilipsAirPurifierPlatform } from './philipsAirPurifierPlatform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform('PhilipsAirPurifierPyAirControl', PhilipsAirPurifierPlatform);
};