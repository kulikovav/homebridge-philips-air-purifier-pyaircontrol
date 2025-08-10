#!/usr/bin/env python3
"""
Simple test script that mimics aioairctrl command line interface
Usage: python3 test_simple.py <ip> status --json
"""

import sys
import json
import asyncio
from aioairctrl import CoAPClient

async def test_status(ip, protocol="coaps"):
    """Test getting status from air purifier"""
    try:
        print(f"Testing connection to {ip} using {protocol}...")

        # Create client (aioairctrl handles encryption automatically)
        print("Creating CoAPClient...")
        client = CoAPClient(ip)
        print("CoAPClient created successfully")

        # Initialize the client by calling _init() directly
        print("Initializing client...")
        await client._init()
        print("Client initialized successfully")

        # Get status
        print("Getting status...")
        status = await asyncio.wait_for(client.get_status(), timeout=15.0)
        print("Status retrieved successfully")

        # Output as JSON
        print("Status data:")
        print(json.dumps(status, indent=2))

        # Cleanup
        print("Cleaning up...")
        await client.shutdown()
        print("Cleanup completed")
        return True

    except asyncio.TimeoutError:
        print("Error: Connection timeout")
        return False
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    if len(sys.argv) < 2:
        print("Usage: test_simple.py <ip> [protocol]")
        print("Example: test_simple.py 192.168.88.150 coaps")
        sys.exit(1)

    ip = sys.argv[1]
    protocol = sys.argv[2] if len(sys.argv) > 2 else "coaps"

    print(f"Starting test with IP: {ip}, Protocol: {protocol}")
    success = await test_status(ip, protocol)
    
    if success:
        print("✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("❌ Test failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
