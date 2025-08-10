#!/usr/bin/env python3
"""
Network connectivity test script for aioairctrl
This script tests network connectivity and provides detailed debugging information
"""

import sys
import asyncio
import socket
import subprocess
import time
from aioairctrl import CoAPClient

def test_basic_connectivity(ip, port=5683):
    """Test basic TCP connectivity to the device"""
    try:
        print(f"Testing basic connectivity to {ip}:{port}...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((ip, port))
        sock.close()

        if result == 0:
            print(f"✅ TCP connection to {ip}:{port} successful")
            return True
        else:
            print(f"❌ TCP connection to {ip}:{port} failed (error code: {result})")
            return False
    except Exception as e:
        print(f"❌ TCP connection test error: {e}")
        return False

def test_ping(ip):
    """Test ping connectivity to the device"""
    try:
        print(f"Testing ping to {ip}...")
        result = subprocess.run(['ping', '-c', '3', '-W', '5', ip],
                              capture_output=True, text=True, timeout=10)

        if result.returncode == 0:
            print(f"✅ Ping to {ip} successful")
            return True
        else:
            print(f"❌ Ping to {ip} failed")
            print(f"   Ping output: {result.stdout}")
            return False
    except subprocess.TimeoutExpired:
        print(f"❌ Ping to {ip} timed out")
        return False
    except Exception as e:
        print(f"❌ Ping test error: {e}")
        return False

async def test_coap_connection(ip, timeout=10):
    """Test CoAP connection with detailed error handling"""
    try:
        print(f"Testing CoAP connection to {ip}...")

        # Create client
        print("  Creating CoAPClient...")
        client = CoAPClient(ip)
        print("  ✅ CoAPClient created")

        # Initialize client
        print("  Initializing client...")
        await asyncio.wait_for(client._init(), timeout=timeout)
        print("  ✅ Client initialized")

        # Test status request
        print("  Testing status request...")
        status = await asyncio.wait_for(client.get_status(), timeout=timeout)
        print("  ✅ Status request successful")
        print(f"  Status data: {status}")

        # Cleanup
        print("  Cleaning up...")
        await client.shutdown()
        print("  ✅ Cleanup completed")

        return True

    except asyncio.TimeoutError:
        print(f"  ❌ CoAP connection timed out after {timeout} seconds")
        return False
    except Exception as e:
        print(f"  ❌ CoAP connection error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_with_retries(ip, max_retries=3, base_timeout=5):
    """Test CoAP connection with exponential backoff retries"""
    print(f"\nTesting CoAP connection with retries (max: {max_retries})...")

    for attempt in range(max_retries):
        timeout = base_timeout * (2 ** attempt)
        print(f"\nAttempt {attempt + 1}/{max_retries} with timeout {timeout}s...")

        try:
            success = await test_coap_connection(ip, timeout=timeout)
            if success:
                print(f"✅ CoAP connection successful on attempt {attempt + 1}")
                return True
        except Exception as e:
            print(f"❌ Attempt {attempt + 1} failed with error: {e}")

        if attempt < max_retries - 1:
            wait_time = min(2 ** attempt, 10)  # Max 10 second wait
            print(f"Waiting {wait_time}s before retry...")
            await asyncio.sleep(wait_time)

    print(f"❌ All {max_retries} attempts failed")
    return False

async def main():
    """Main test function"""
    if len(sys.argv) < 2:
        print("Usage: test_network.py <ip> [timeout]")
        print("Example: test_network.py 192.168.88.150 15")
        sys.exit(1)

    ip = sys.argv[1]
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 15

    print(f"=== Network Connectivity Test for {ip} ===\n")

    # Test basic connectivity first
    print("1. Testing basic network connectivity...")
    if not test_basic_connectivity(ip):
        print("❌ Basic connectivity failed. Check if the device is reachable.")
        sys.exit(1)

    # Test ping
    print("\n2. Testing ping connectivity...")
    if not test_ping(ip):
        print("⚠️  Ping failed, but continuing with CoAP test...")

    # Test CoAP connection
    print("\n3. Testing CoAP connection...")
    success = await test_coap_connection(ip, timeout)

    if not success:
        print("\n4. Testing CoAP connection with retries...")
        success = await test_with_retries(ip, max_retries=3, base_timeout=5)

    # Summary
    print(f"\n=== Test Summary ===")
    if success:
        print("✅ All tests passed! The device is reachable via CoAP.")
        sys.exit(0)
    else:
        print("❌ Tests failed. The device may be:")
        print("   - Not reachable on the network")
        print("   - Not responding to CoAP requests")
        print("   - Blocked by firewall")
        print("   - Using a different port or protocol")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
