#!/usr/bin/env python3
"""
Plugin Polling Interface for Homebridge Philips Air Purifier Plugin
This script provides a clean interface for the plugin to interact with the DevicePollingManager
"""

import asyncio
import json
import sys
import time
import logging
from typing import Dict, Any, Optional
from device_polling_manager import DevicePollingManager, DeviceConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PluginPollingInterface:
    """Interface class for the Homebridge plugin to interact with the polling manager"""

    def __init__(self):
        self.manager = DevicePollingManager()
        self._started = False

    async def start_manager(self):
        """Start the polling manager if not already started"""
        if not self._started:
            await self.manager.start()
            self._started = True
            logger.info("Polling manager started")

    async def ensure_device_managed(self, device_id: str, ip: str, protocol: str = "coaps",
                                  port: int = 5683, poll_interval: int = 15) -> bool:
        """Ensure a device is being managed by the polling manager"""
        try:
            # Check if device is already managed
            if device_id in self.manager.get_all_devices_info():
                logger.debug(f"Device {device_id} already managed")
                return True

            # Create device config
            config = DeviceConfig(
                ip=ip,
                port=port,
                protocol=protocol,
                poll_interval=poll_interval,
                timeout=8,
                max_retries=2,
                retry_delay=3
            )

            # Add device with a simple callback that just logs
            def status_callback(dev_id: str, status_data):
                logger.debug(f"Status update for {dev_id}: {len(status_data) if isinstance(status_data, dict) else 'non-dict data'}")

            await self.manager.add_device(device_id, config, status_callback)
            logger.info(f"Added device {device_id} at {ip}:{port}")
            return True

        except Exception as e:
            logger.error(f"Failed to add device {device_id}: {e}")
            return False

    async def get_device_status(self, device_id: str, ip: str, protocol: str = "coaps",
                               port: int = 5683, force_poll: bool = False) -> Dict[str, Any]:
        """Get device status, optionally forcing a fresh poll"""
        try:
            # Ensure device is managed
            if not await self.ensure_device_managed(device_id, ip, protocol, port):
                return {"error": "Failed to manage device"}

            # Get cached status
            device_info = self.manager.get_device_info(device_id)
            if not device_info:
                return {"error": "Device not found in manager"}

            # If force poll requested or no cached data, force a poll
            if force_poll or not device_info.get("status_data"):
                logger.debug(f"Force polling device {device_id}")
                await self.manager.force_poll_device(device_id)
                # Wait a bit for the poll to complete
                await asyncio.sleep(2)
                device_info = self.manager.get_device_info(device_id)

            # Return status data
            status_data = device_info.get("status_data", {})
            if not status_data:
                return {"error": "No status data available"}

            # Add metadata
            result = {
                "success": True,
                "status_data": status_data,
                "is_connected": device_info.get("is_connected", False),
                "last_update": device_info.get("last_update", 0),
                "error_count": device_info.get("error_count", 0)
            }

            return result

        except Exception as e:
            logger.error(f"Error getting status for {device_id}: {e}")
            return {"error": str(e)}

    async def set_device_value(self, device_id: str, ip: str, characteristic: str, value: str,
                              protocol: str = "coaps", port: int = 5683) -> Dict[str, Any]:
        """Set a device characteristic value"""
        try:
            # Ensure device is managed
            if not await self.ensure_device_managed(device_id, ip, protocol, port):
                return {"error": "Failed to manage device"}

            # Get the client from the manager
            client = self.manager.get_device_client(device_id)
            if not client:
                return {"error": "Device client not available"}

            # Set the value
            logger.info(f"Setting {characteristic}={value} for {device_id}")
            await client.set_control_value(characteristic, value)

            # Force a status update to get the new state
            await self.manager.force_poll_device(device_id)

            return {"success": True, "message": f"Set {characteristic}={value}"}

        except Exception as e:
            logger.error(f"Error setting value for {device_id}: {e}")
            return {"error": str(e)}

    async def shutdown(self):
        """Shutdown the polling manager"""
        if self._started:
            await self.manager.stop()
            self._started = False
            logger.info("Polling manager stopped")

# Global instance
interface = PluginPollingInterface()

async def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: plugin_polling_interface.py <command> <device_id> [args...]"}))
        return

    command = sys.argv[1]
    device_id = sys.argv[2]

    try:
        await interface.start_manager()

        if command == "status":
            if len(sys.argv) < 5:
                print(json.dumps({"error": "Usage: plugin_polling_interface.py status <device_id> <ip> [protocol] [port] [force_poll]"}))
                return

            ip = sys.argv[3]
            protocol = sys.argv[4] if len(sys.argv) > 4 else "coaps"
            port = int(sys.argv[5]) if len(sys.argv) > 5 else 5683
            force_poll = sys.argv[6].lower() == "true" if len(sys.argv) > 6 else False

            result = await interface.get_device_status(device_id, ip, protocol, port, force_poll)
            print(json.dumps(result))

        elif command == "set":
            if len(sys.argv) < 6:
                print(json.dumps({"error": "Usage: plugin_polling_interface.py set <device_id> <ip> <characteristic> <value> [protocol] [port]"}))
                return

            ip = sys.argv[3]
            characteristic = sys.argv[4]
            value = sys.argv[5]
            protocol = sys.argv[6] if len(sys.argv) > 6 else "coaps"
            port = int(sys.argv[7]) if len(sys.argv) > 7 else 5683

            result = await interface.set_device_value(device_id, ip, characteristic, value, protocol, port)
            print(json.dumps(result))

        elif command == "info":
            device_info = interface.manager.get_device_info(device_id)
            if device_info:
                # Convert time to readable format
                if device_info.get("last_update"):
                    device_info["last_update_readable"] = time.strftime("%Y-%m-%d %H:%M:%S",
                                                                      time.localtime(device_info["last_update"]))
                if device_info.get("last_success"):
                    device_info["last_success_readable"] = time.strftime("%Y-%m-%d %H:%M:%S",
                                                                       time.localtime(device_info["last_success"]))
                print(json.dumps({"success": True, "device_info": device_info}))
            else:
                print(json.dumps({"error": "Device not found"}))

        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
    finally:
        await interface.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
