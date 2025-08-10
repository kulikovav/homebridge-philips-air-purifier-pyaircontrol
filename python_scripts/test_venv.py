#!/usr/bin/env python3
"""
Test script to verify virtual environment setup.
This script tests that all required dependencies are available.
"""

import sys
import json

def test_imports():
    """Test that all required modules can be imported."""
    results = {}

    try:
        import pyairctrl
        results['pyairctrl'] = 'OK'
    except ImportError as e:
        results['pyairctrl'] = f'FAILED: {e}'

    try:
        import aiocoap
        results['aiocoap'] = 'OK'
    except ImportError as e:
        results['aiocoap'] = f'FAILED: {e}'

    try:
        import requests
        results['requests'] = 'OK'
    except ImportError as e:
        results['requests'] = f'FAILED: {e}'

    return results

def main():
    """Main test function."""
    print("Testing Python virtual environment setup...")
    print(f"Python executable: {sys.executable}")
    print(f"Python version: {sys.version}")
    print(f"Python path: {sys.path[0]}")
    print()

    # Test imports
    results = test_imports()

    print("Import test results:")
    for module, status in results.items():
        print(f"  {module}: {status}")

    print()

    # Check if all imports succeeded
    all_ok = all(status == 'OK' for status in results.values())

    if all_ok:
        print("✅ All tests passed! Virtual environment is working correctly.")
        print("You can now use this Python executable in your plugin configuration.")
    else:
        print("❌ Some tests failed. Please check the virtual environment setup.")
        print("Try running: npm run postinstall")

    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
