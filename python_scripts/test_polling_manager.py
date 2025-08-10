#!/usr/bin/env python3
"""
Test script for the Device Polling Manager
This script tests the polling interface to prevent device hangs
"""

import asyncio
import json
import time
from device_polling_manager import DevicePollingManager, DeviceConfig

async def test_polling_manager():
    """Test the polling manager with the known IPs"""

    print("=== Testing Device Polling Manager ===\n")

    # Create manager
    manager = DevicePollingManager()

    # Add test devices with different configurations
    devices_config = [
        ("device_150", DeviceConfig(
            ip="192.168.88.150",
            port=5683,
            protocol="coaps",
            poll_interval=20,  # Shorter interval for testing
            timeout=10,
            max_retries=2,
            retry_delay=3
        )),
        ("device_190", DeviceConfig(
            ip="192.168.88.190",
            port=5683,
            protocol="coaps",
            poll_interval=25,  # Different interval
            timeout=10,
            max_retries=2,
            retry_delay=3
        ))
    ]

    # Status callback function
    def status_callback(device_id: str, status_data: dict):
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] 📡 Status update for {device_id}:")

        if status_data and isinstance(status_data, dict):
            # Handle dictionary status data
            print(f"    Power: {status_data.get('pwr', 'Unknown')}")
            print(f"    Mode: {status_data.get('mode', 'Unknown')}")
            print(f"    Fan Speed: {status_data.get('om', 'Unknown')}")
            print(f"    Filter Life: {status_data.get('fltsts0', 'Unknown')}")
            print(f"    Total fields: {len(status_data)}")
        elif status_data:
            # Handle non-dictionary status data
            print(f"    Raw status: {status_data}")
            print(f"    Type: {type(status_data)}")
        else:
            print("    No status data")
        print()

    # Add devices
    print("Adding devices to polling manager...")
    for device_id, config in devices_config:
        await manager.add_device(device_id, config, status_callback)
        print(f"✅ Added {device_id} at {config.ip}:{config.port}")

    print("\nStarting polling manager...")
    await manager.start()

    try:
        print("Polling manager started. Monitoring devices for 2 minutes...\n")

        # Monitor for 2 minutes
        start_time = time.time()
        while time.time() - start_time < 120:
            # Print device status every 30 seconds
            if int(time.time() - start_time) % 30 == 0:
                print(f"\n--- Device Status at {time.strftime('%H:%M:%S')} ---")
                device_info = manager.get_all_devices_info()
                for device_id, info in device_info.items():
                    if info:
                        status_icon = "🟢" if info["is_connected"] else "🔴"
                        print(f"{status_icon} {device_id}:")
                        print(f"    IP: {info['ip']}:{info['port']}")
                        print(f"    Connected: {info['is_connected']}")
                        print(f"    Last Update: {time.strftime('%H:%M:%S', time.localtime(info['last_update']))}")
                        print(f"    Last Success: {time.strftime('%H:%M:%S', time.localtime(info['last_success']))}")
                        print(f"    Error Count: {info['error_count']}")
                        if info['last_error']:
                            print(f"    Last Error: {info['last_error']}")
                        print()

            await asyncio.sleep(1)

        # Final status
        print("\n=== Final Device Status ===")
        device_info = manager.get_all_devices_info()
        for device_id, info in device_info.items():
            if info:
                status_icon = "🟢" if info["is_connected"] else "🔴"
                print(f"{status_icon} {device_id}:")
                print(f"    IP: {info['ip']}:{info['port']}")
                print(f"    Connected: {info['is_connected']}")
                print(f"    Error Count: {info['error_count']}")
                if info['last_error']:
                    print(f"    Last Error: {info['last_error']}")
                print()

        # Test force poll
        print("Testing force poll...")
        for device_id in device_info:
            print(f"Force polling {device_id}...")
            await manager.force_poll_device(device_id)
            await asyncio.sleep(2)  # Wait a bit

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    finally:
        print("\nStopping polling manager...")
        await manager.stop()
        print("✅ Polling manager stopped")

async def test_single_device():
    """Test with a single device to isolate issues"""

    print("=== Testing Single Device ===\n")

    manager = DevicePollingManager()

    # Test with just one device
    config = DeviceConfig(
        ip="192.168.88.150",
        port=5683,
        protocol="coaps",
        poll_interval=15,
        timeout=8,
        max_retries=1,
        retry_delay=2
    )

    def simple_callback(device_id: str, status_data: dict):
        if status_data and isinstance(status_data, dict):
            print(f"✅ Got status from {device_id}: {len(status_data)} fields")
        elif status_data:
            print(f"✅ Got status from {device_id}: {type(status_data)} - {status_data}")
        else:
            print(f"✅ Got status from {device_id}: No data")

    await manager.add_device("test_device", config, simple_callback)
    await manager.start()

    try:
        print("Monitoring single device for 1 minute...")
        await asyncio.sleep(60)

        # Get cached status
        cached_status = await manager.get_device_status("test_device")
        if cached_status:
            print(f"📋 Cached status has {len(cached_status)} fields")
        else:
            print("📋 No cached status available")

    finally:
        await manager.stop()

if __name__ == "__main__":
    print("Choose test mode:")
    print("1. Full polling manager test (2 minutes)")
    print("2. Single device test (1 minute)")

    try:
        choice = input("Enter choice (1 or 2): ").strip()

        if choice == "1":
            asyncio.run(test_polling_manager())
        elif choice == "2":
            asyncio.run(test_single_device())
        else:
            print("Invalid choice, running full test...")
            asyncio.run(test_polling_manager())

    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()
