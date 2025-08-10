#!/usr/bin/env python3
"""
Test common IP addresses for Philips Air Purifiers
This script tests a predefined list of common IP addresses
"""

import sys
import asyncio
from aioairctrl import CoAPClient

# Common IP addresses that Philips Air Purifiers might use
COMMON_IPS = [
    "192.168.1.100",
    "192.168.1.101",
    "192.168.1.102",
    "192.168.1.103",
    "192.168.1.104",
    "192.168.1.105",
    "192.168.1.106",
    "192.168.1.107",
    "192.168.1.108",
    "192.168.1.109",
    "192.168.1.110",
    "192.168.88.150",  # The IP from your original config
    "192.168.88.151",
    "192.168.88.152",
    "192.168.88.153",
    "192.168.88.154",
    "192.168.88.155",
    "192.168.88.156",
    "192.168.88.157",
    "192.168.88.158",
    "192.168.88.159",
    "192.168.88.160",
    "192.168.0.100",
    "192.168.0.101",
    "192.168.0.102",
    "192.168.0.103",
    "192.168.0.104",
    "192.168.0.105",
    "10.0.0.100",
    "10.0.0.101",
    "10.0.0.102",
    "10.0.0.103",
    "10.0.0.104",
    "10.0.0.105"
]

async def test_ip(ip, timeout=5):
    """Test if an IP responds to aioairctrl CoAP requests"""
    try:
        print(f"🔍 Testing {ip}...")

        # Create client
        client = CoAPClient(ip)

        # Initialize client
        await asyncio.wait_for(client._init(), timeout=timeout)
        print(f"  ✅ {ip}: Client initialized")

        # Try to get status
        status = await asyncio.wait_for(client.get_status(), timeout=timeout)
        print(f"  ✅ {ip}: Status request successful")

        # Cleanup
        await client.shutdown()
        print(f"  ✅ {ip}: Cleanup completed")

        return True, status

    except asyncio.TimeoutError:
        print(f"  ⏰ {ip}: Timeout")
        return False, "Timeout"
    except Exception as e:
        print(f"  ❌ {ip}: Error - {e}")
        return False, str(e)

async def main():
    """Test all common IP addresses"""
    print("=== Testing Common IP Addresses for Philips Air Purifiers ===\n")

    successful_ips = []

    for ip in COMMON_IPS:
        try:
            success, result = await test_ip(ip, timeout=5)
            if success:
                successful_ips.append((ip, result))
                print(f"🎉 SUCCESS! {ip} is a Philips Air Purifier!")
                print(f"   Status: {result}")
                print()
        except Exception as e:
            print(f"  ❌ {ip}: Unexpected error - {e}")
            print()

    # Summary
    print("=== Test Summary ===")
    if successful_ips:
        print(f"✅ Found {len(successful_ips)} Philips Air Purifier(s):")
        for ip, status in successful_ips:
            print(f"   - {ip}: {status}")
        print(f"\nRecommended configuration:")
        print(f"   IP: {successful_ips[0][0]}")
        print(f"   Protocol: coaps")
        print(f"   Port: 5683 (default)")
    else:
        print("❌ No Philips Air Purifiers found on common IP addresses")
        print("\nPossible reasons:")
        print("   - Device is not powered on")
        print("   - Device is not connected to the network")
        print("   - Device uses a different IP address")
        print("   - Device is on a different network segment")
        print("   - Firewall is blocking CoAP traffic")

    print("\n=== Test Complete ===")

if __name__ == "__main__":
    asyncio.run(main())
