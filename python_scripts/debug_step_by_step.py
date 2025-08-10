#!/usr/bin/env python3

import sys
print("=== Step-by-step debug ===")
print(f"Python version: {sys.version}")
print(f"Python path: {sys.path[:3]}...")

try:
    print("\n1. Importing aioairctrl module...")
    import aioairctrl
    print("   ✅ aioairctrl module imported")

    print("\n2. Checking aioairctrl contents...")
    print(f"   aioairctrl dir: {[attr for attr in dir(aioairctrl) if not attr.startswith('_')]}")

    print("\n3. Importing CoAPClient class...")
    from aioairctrl import CoAPClient
    print("   ✅ CoAPClient class imported")

    print("\n4. Checking CoAPClient class...")
    print(f"   CoAPClient type: {type(CoAPClient)}")
    print(f"   CoAPClient module: {CoAPClient.__module__}")
    print(f"   CoAPClient __init__ signature: {CoAPClient.__init__.__code__.co_varnames}")

    print("\n5. Creating CoAPClient instance...")
    print("   About to call: CoAPClient('192.168.88.150')")
    client = CoAPClient('192.168.88.150')
    print("   ✅ CoAPClient instance created successfully")

    print("\n6. Checking client instance...")
    print(f"   Client type: {type(client)}")
    print(f"   Client dir: {[attr for attr in dir(client) if not attr.startswith('_')]}")

    print("\n7. Debug completed successfully!")

except Exception as e:
    print(f"\n❌ Error occurred at step above: {e}")
    import traceback
    traceback.print_exc()

    # Additional debugging info
    print(f"\n=== Additional Debug Info ===")
    print(f"Current working directory: {os.getcwd() if 'os' in locals() else 'os not imported'}")
    print(f"Python executable: {sys.executable}")

    if 'CoAPClient' in locals():
        print(f"CoAPClient in locals: {CoAPClient}")
        print(f"CoAPClient __dict__: {getattr(CoAPClient, '__dict__', 'No __dict__')}")
