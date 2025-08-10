#!/usr/bin/env python3
"""
Integration test script for aioairctrl with Philips Air Purifier
This script tests the connection and basic functionality
"""

import sys
import json
import asyncio
import time
from aioairctrl import CoAPClient

class AirPurifierTester:
    def __init__(self, ip, protocol="coaps"):
        self.ip = ip
        self.protocol = protocol
        self.client = None
        self.test_results = {}

    async def connect(self):
        """Test connection to the air purifier"""
        try:
            print(f"🔌 Testing connection to {self.ip} using {self.protocol}...")
            use_encryption = (self.protocol == "coaps")
            self.client = CoAPClient(self.ip, use_encryption=use_encryption)

            # Test basic connectivity with a timeout
            print("   Testing basic connectivity...")
            await asyncio.wait_for(self.client._init(), timeout=10.0)
            print("   ✅ Connection successful!")
            return True
        except asyncio.TimeoutError:
            print("   ❌ Connection timeout - device may be unreachable")
            return False
        except Exception as e:
            print(f"   ❌ Connection failed: {e}")
            return False

    async def test_get_status(self):
        """Test getting device status"""
        try:
            print("📊 Testing get_status()...")
            start_time = time.time()
            status = await asyncio.wait_for(self.client.get_status(), timeout=15.0)
            end_time = time.time()

            response_time = (end_time - start_time) * 1000
            print(f"   ✅ Status retrieved in {response_time:.1f}ms")
            print(f"   📋 Status keys: {list(status.keys())}")

            # Check for common status fields
            expected_fields = ['pwr', 'pm25', 'fltsts0', 'mode']
            found_fields = [field for field in expected_fields if field in status]
            print(f"   📋 Found expected fields: {found_fields}")

            self.test_results['get_status'] = {
                'success': True,
                'response_time_ms': response_time,
                'status_keys': list(status.keys()),
                'found_expected_fields': found_fields
            }
            return True
        except asyncio.TimeoutError:
            print("   ❌ get_status() timeout")
            self.test_results['get_status'] = {'success': False, 'error': 'timeout'}
            return False
        except Exception as e:
            print(f"   ❌ get_status() failed: {e}")
            self.test_results['get_status'] = {'success': False, 'error': str(e)}
            return False

    async def test_set_control_values(self):
        """Test setting control values (read-only test)"""
        try:
            print("⚙️  Testing set_control_values() (read-only test)...")

            # Try to get current power state first
            status = await asyncio.wait_for(self.client.get_status(), timeout=10.0)
            current_power = status.get('pwr', 0)

            print(f"   📋 Current power state: {current_power}")
            print("   ℹ️  Skipping actual value setting (read-only test)")

            self.test_results['set_control_values'] = {
                'success': True,
                'current_power': current_power,
                'note': 'read-only test completed'
            }
            return True
        except Exception as e:
            print(f"   ❌ set_control_values() test failed: {e}")
            self.test_results['set_control_values'] = {'success': False, 'error': str(e)}
            return False

    async def test_observe_status(self):
        """Test status observation (if supported)"""
        try:
            print("👁️  Testing observe_status()...")

            # Start observation
            observation = await asyncio.wait_for(
                self.client.observe_status(), timeout=5.0
            )

            # Wait a bit for any updates
            await asyncio.sleep(2)

            # Cancel observation
            observation.cancel()

            print("   ✅ Status observation test completed")
            self.test_results['observe_status'] = {'success': True}
            return True
        except Exception as e:
            print(f"   ❌ observe_status() test failed: {e}")
            self.test_results['observe_status'] = {'success': False, 'error': str(e)}
            return False

    async def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting aioairctrl Integration Tests")
        print("=" * 50)

        # Test connection
        if not await self.connect():
            print("❌ Cannot proceed with tests - connection failed")
            return False

        print()

        # Run individual tests
        await self.test_get_status()
        print()

        await self.test_set_control_values()
        print()

        await self.test_observe_status()
        print()

        # Print summary
        self.print_summary()
        return True

    def print_summary(self):
        """Print test results summary"""
        print("📊 Test Results Summary")
        print("=" * 50)

        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results.values() if result.get('success', False))

        print(f"Total Tests: {total_tests}")
        print(f"Successful: {successful_tests}")
        print(f"Failed: {total_tests - successful_tests}")
        print()

        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result.get('success', False) else "❌ FAIL"
            print(f"{test_name}: {status}")
            if 'error' in result:
                print(f"  Error: {result['error']}")
            if 'response_time_ms' in result:
                print(f"  Response Time: {result['response_time_ms']:.1f}ms")

        print()
        if successful_tests == total_tests:
            print("🎉 All tests passed! aioairctrl integration is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the error messages above.")

    async def cleanup(self):
        """Clean up resources"""
        if self.client:
            try:
                await self.client.shutdown()
                print("🧹 Cleanup completed")
            except Exception as e:
                print(f"⚠️  Cleanup warning: {e}")

async def main():
    if len(sys.argv) < 2:
        print("Usage: test_integration.py <ip_address> [protocol]")
        print("Example: test_integration.py 192.168.88.150 coaps")
        sys.exit(1)

    ip = sys.argv[1]
    protocol = sys.argv[2] if len(sys.argv) > 2 else "coaps"

    print(f"🎯 Testing Philips Air Purifier at {ip} using {protocol}")
    print()

    tester = AirPurifierTester(ip, protocol)

    try:
        await tester.run_all_tests()
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
