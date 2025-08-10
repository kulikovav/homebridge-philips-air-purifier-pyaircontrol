#!/usr/bin/env python3

import asyncio
from aioairctrl import CoAPClient

async def test_minimal():
    print("Starting minimal async test...")

    try:
        print("Creating CoAPClient...")
        client = CoAPClient('192.168.88.150')
        print("CoAPClient created successfully")
        return True
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    return await test_minimal()

if __name__ == "__main__":
    result = asyncio.run(main())
    print(f"Test result: {result}")
