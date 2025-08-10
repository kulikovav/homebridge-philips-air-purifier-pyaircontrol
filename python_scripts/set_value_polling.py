#!/usr/bin/env python3
"""
Set value on Philips Air Purifier using the polling manager
This script sets values while maintaining persistent connections to prevent device hangs
"""

import sys
import asyncio
import json
from device_polling_manager import DevicePollingManager, DeviceConfig

# Global polling manager instance
_polling_manager = None

async def get_or_create_polling_manager():
    """Get or create the global polling manager instance"""
    global _polling_manager

    if _polling_manager is None:
        _polling_manager = DevicePollingManager()
        await _polling_manager.start()

    return _polling_manager

async def set_device_value(ip: str, key: str, value, protocol: str = "coaps",
                          port: int = 5683, poll_interval: int = 30, timeout: int = 15):
    """Set a value on the device using the polling manager"""

    # Create device ID from IP
    device_id = f"device_{ip.replace('.', '_')}"

    # Get or create polling manager
    manager = await get_or_create_polling_manager()

    # Check if device is already being managed
    device_info = manager.get_device_info(device_id)

    if device_info is None:
        # Add device to polling manager
        config = DeviceConfig(
            ip=ip,
            port=port,
            protocol=protocol,
            poll_interval=poll_interval,
            timeout=timeout
        )

        await manager.add_device(device_id, config)
        print(f"Added device {device_id} to polling manager", file=sys.stderr)

    # Get the client from the manager
    if device_id not in manager.clients:
        # Force a poll to create the client
        await manager.force_poll_device(device_id)
        await asyncio.sleep(1)

    if device_id not in manager.clients:
        return {"error": f"Could not establish connection to device {device_id}"}

    # Set the value using the existing client
    try:
        client = manager.clients[device_id]

        # Set the control value
        result = await asyncio.wait_for(
            client.set_control_values({key: value}),
            timeout=timeout
        )

        # Force a status update to refresh the cache
        await manager.force_poll_device(device_id)

        return {
            "success": True,
            "message": f"Set {key} to {value}",
            "result": result
        }

    except asyncio.TimeoutError:
        return {"error": f"Timeout setting {key} to {value}"}
    except Exception as e:
        return {"error": f"Error setting {key} to {value}: {str(e)}"}

async def main():
    """Main function"""
    if len(sys.argv) < 4:
        print("Usage: set_value_polling.py <ip> <key> <value> [protocol] [port] [poll_interval] [timeout]")
        sys.exit(1)

    ip = sys.argv[1]
    key = sys.argv[2]
    value = sys.argv[3]

    # Convert value to appropriate type
    try:
        if value.lower() in ['true', 'false']:
            value = value.lower() == 'true'
        elif value.isdigit():
            value = int(value)
        elif value.replace('.', '').isdigit():
            value = float(value)
    except:
        pass  # Keep as string if conversion fails

    protocol = sys.argv[4] if len(sys.argv) > 4 else "coaps"
    port = int(sys.argv[5]) if len(sys.argv) > 5 else 5683
    poll_interval = int(sys.argv[6]) if len(sys.argv) > 6 else 30
    timeout = int(sys.argv[7]) if len(sys.argv) > 7 else 15

    try:
        result = await set_device_value(ip, key, value, protocol, port, poll_interval, timeout)
        print(json.dumps(result))

        if "error" in result:
            sys.exit(1)

    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
