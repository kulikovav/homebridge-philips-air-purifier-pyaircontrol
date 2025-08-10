#!/usr/bin/env python3

import sys
print("Python version:", sys.version)
print("Starting debug test...")

try:
    print("Importing aioairctrl...")
    import aioairctrl
    print("aioairctrl imported successfully")

    print("Importing CoAPClient...")
    from aioairctrl import CoAPClient
    print("CoAPClient imported successfully")

    print("Creating CoAPClient instance...")
    client = CoAPClient('192.168.88.150')
    print("CoAPClient instance created successfully")

    print("Debug test completed successfully!")

except Exception as e:
    print(f"Error occurred: {e}")
    import traceback
    traceback.print_exc()
