#!/usr/bin/env python3
"""
Get status from Philips Air Purifier using the polling manager
This script gets cached status to prevent device hangs
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

async def get_device_status(ip: str, protocol: str = "coaps", port: int = 5683,
                           poll_interval: int = 30, timeout: int = 15):
    """Get device status using the polling manager"""

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

    # Get cached status
    status = await manager.get_device_status(device_id)

    if status is None:
        # No cached status, force a poll
        print(f"Forcing immediate poll of {device_id}", file=sys.stderr)
        await manager.force_poll_device(device_id)

        # Wait a bit for the poll to complete
        await asyncio.sleep(2)

        # Try to get status again
        status = await manager.get_device_status(device_id)

    if status is None:
        # Still no status, return error
        return {"error": f"No status available for device {device_id}"}

    return status

async def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: get_status_polling.py <ip> [protocol] [port] [poll_interval] [timeout]")
        sys.exit(1)

    ip = sys.argv[1]
    protocol = sys.argv[2] if len(sys.argv) > 2 else "coaps"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 5683
    poll_interval = int(sys.argv[4]) if len(sys.argv) > 4 else 30
    timeout = int(sys.argv[5]) if len(sys.argv) > 5 else 15

    try:
        status = await get_device_status(ip, protocol, port, poll_interval, timeout)
        print(json.dumps(status))

    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
