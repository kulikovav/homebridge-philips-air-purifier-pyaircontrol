#!/usr/bin/env python3
"""
Synchronous test script to isolate the CoAPClient issue
"""

import sys
import json
from aioairctrl import CoAPClient

def test_status_sync(ip, protocol="coaps"):
    """Test getting status from air purifier (synchronous)"""
    try:
        print(f"Testing connection to {ip} using {protocol}...")

        # Create client (aioairctrl handles encryption automatically)
        print("Creating CoAPClient...")
        client = CoAPClient(ip)
        print("CoAPClient created successfully")

        print("Test completed successfully!")
        return True

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: test_simple_sync.py <ip> [protocol]")
        print("Example: test_simple_sync.py 192.168.88.150 coaps")
        sys.exit(1)

    ip = sys.argv[1]
    protocol = sys.argv[2] if len(sys.argv) > 2 else "coaps"

    success = test_status_sync(ip, protocol)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
