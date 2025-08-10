#!/usr/bin/env python3
"""
Advanced test script for aioairctrl with different ports and settings
This script tests potentially reachable IPs with various configurations
"""

import sys
import asyncio
import json
import traceback
from aioairctrl import CoAPClient

# IPs that showed client initialization success
REACHABLE_IPS = [
    "192.168.88.150",
    "192.168.88.190"
]

# Common CoAP ports to try
COAP_PORTS = [5683, 5684, 5685, 5686, 5687, 5688, 5689, 5690]

async def test_ip_port(ip, port, timeout=10):
    """Test a specific IP and port combination"""
    print(f"🔍 Testing {ip}:{port}...")
    try:
        # Create client with specific port
        client = CoAPClient(ip, port=port)

        # Initialize the client
        await asyncio.wait_for(client._init(), timeout=timeout)
        print(f"  ✅ {ip}:{port}: Client initialized")

        # Try to get status
        status = await asyncio.wait_for(client.get_status(), timeout=timeout)
        print(f"  🎉 {ip}:{port}: SUCCESS! Status retrieved!")
        print(f"     Status: {json.dumps(status, indent=4)}")

        # Cleanup
        await client.shutdown()
        return True, status

    except asyncio.TimeoutError:
        print(f"  ⏰ {ip}:{port}: Timeout")
        return False, "Timeout"
    except Exception as e:
        print(f"  ❌ {ip}:{port}: Error - {e}")
        return False, str(e)

async def test_ip_all_ports(ip, timeout=10):
    """Test an IP with all common CoAP ports"""
    print(f"\n=== Testing {ip} with all ports ===")
    successful_ports = []

    for port in COAP_PORTS:
        success, result = await test_ip_port(ip, port, timeout)
        if success:
            successful_ports.append((port, result))
            print(f"🎉 FOUND WORKING CONFIGURATION: {ip}:{port}")
            break

    if not successful_ports:
        print(f"❌ No working configuration found for {ip}")

    return successful_ports

async def main():
    """Test all reachable IPs with different ports"""
    print("=== Advanced aioairctrl Test with Multiple Ports ===\n")

    all_results = {}

    for ip in REACHABLE_IPS:
        results = await test_ip_all_ports(ip, timeout=10)
        all_results[ip] = results

    # Summary
    print("\n=== Test Summary ===")
    working_configs = []

    for ip, results in all_results.items():
        if results:
            for port, status in results:
                working_configs.append((ip, port, status))
                print(f"✅ {ip}:{port} - WORKING!")
        else:
            print(f"❌ {ip} - No working configuration found")

    if working_configs:
        print(f"\n🎉 Found {len(working_configs)} working configuration(s)!")
        print("\nWorking configurations:")
        for ip, port, status in working_configs:
            print(f"  {ip}:{port}")
    else:
        print("\n❌ No working configurations found")
        print("\nPossible next steps:")
        print("  1. Check if the device is powered on")
        print("  2. Verify the device is connected to the network")
        print("  3. Check if the device uses a different protocol")
        print("  4. Try scanning the network from the host (not Docker)")
        print("  5. Check device documentation for specific port requirements")

if __name__ == "__main__":
    asyncio.run(main())
