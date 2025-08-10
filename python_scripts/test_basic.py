#!/usr/bin/env python3
"""
Basic test script to verify aioairctrl library functionality
This script tests library imports and basic object creation without network access
"""

import sys
import asyncio

def test_imports():
    """Test basic imports"""
    try:
        print("Testing imports...")
        import aioairctrl
        print("✅ aioairctrl imported successfully")

        from aioairctrl import CoAPClient
        print("✅ CoAPClient imported successfully")

        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_object_creation():
    """Test object creation without network access"""
    try:
        print("\nTesting object creation...")
        from aioairctrl import CoAPClient

        # Create client instance
        client = CoAPClient('192.168.88.150')
        print("✅ CoAPClient instance created successfully")

        # Check client attributes
        print(f"   Host: {client.host}")
        print(f"   Port: {client.port}")
        print(f"   Has _init method: {hasattr(client, '_init')}")
        print(f"   Has get_status method: {hasattr(client, 'get_status')}")
        print(f"   Has set_control_values method: {hasattr(client, 'set_control_values')}")

        return True
    except Exception as e:
        print(f"❌ Object creation error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_async_methods():
    """Test async method signatures without network access"""
    try:
        print("\nTesting async method signatures...")
        from aioairctrl import CoAPClient

        client = CoAPClient('192.168.88.150')

        # Check method signatures
        print(f"   get_status signature: {client.get_status.__code__.co_varnames}")
        print(f"   set_control_values signature: {client.set_control_values.__code__.co_varnames}")
        print(f"   shutdown signature: {client.shutdown.__code__.co_varnames}")

        return True
    except Exception as e:
        print(f"❌ Async method test error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("=== aioairctrl Basic Library Tests ===\n")

    # Test imports
    if not test_imports():
        print("\n❌ Import tests failed!")
        sys.exit(1)

    # Test object creation
    if not test_object_creation():
        print("\n❌ Object creation tests failed!")
        sys.exit(1)

    # Test async methods
    try:
        result = asyncio.run(test_async_methods())
        if not result:
            print("\n❌ Async method tests failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Async method tests failed with exception: {e}")
        sys.exit(1)

    print("\n✅ All basic tests passed!")
    print("\nNote: These tests only verify library functionality.")
    print("For network connectivity tests, run the Docker container.")

if __name__ == "__main__":
    main()
