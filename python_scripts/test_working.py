#!/usr/bin/env python3

import asyncio
import sys

# Import the working parts
from aioairctrl import CoAPClient

async def test_working():
    """Test that works"""
    try:
        print("Testing working approach...")

        # This should work based on our previous tests
        client = CoAPClient('192.168.88.150')
        print("✅ CoAPClient created successfully")

        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    return await test_working()

if __name__ == "__main__":
    result = asyncio.run(main())
    print(f"Test result: {result}")
    sys.exit(0 if result else 1)
