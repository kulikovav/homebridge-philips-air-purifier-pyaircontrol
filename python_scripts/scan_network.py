#!/usr/bin/env python3
"""
Network scanner to find Philips Air Purifiers
This script scans the local network for devices that might be Philips Air Purifiers
"""

import sys
import socket
import subprocess
import asyncio
import ipaddress
from concurrent.futures import ThreadPoolExecutor, as_completed

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Create a socket to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "192.168.1.1"  # Fallback

def get_network_range(local_ip):
    """Get the network range based on local IP"""
    try:
        # Assume /24 network for simplicity
        network = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)
        return str(network.network_address), str(network.broadcast_address)
    except Exception:
        return "192.168.1.1", "192.168.1.254"

def ping_host(ip):
    """Ping a single host"""
    try:
        result = subprocess.run(['ping', '-c', '1', '-W', '2', ip],
                              capture_output=True, text=True, timeout=5)
        return ip, result.returncode == 0
    except:
        return ip, False

def scan_network_ips(start_ip, end_ip, max_workers=50):
    """Scan network for reachable IPs"""
    print(f"Scanning network from {start_ip} to {end_ip}...")

    # Convert IPs to integers for iteration
    start_int = int(ipaddress.IPv4Address(start_ip))
    end_int = int(ipaddress.IPv4Address(end_ip))

    reachable_ips = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit ping tasks
        future_to_ip = {
            executor.submit(ping_host, str(ipaddress.IPv4Address(ip))): ip
            for ip in range(start_int, end_int + 1)
        }

        # Process results as they complete
        for future in as_completed(future_to_ip):
            ip, reachable = future.result()
            if reachable:
                reachable_ips.append(ip)
                print(f"✅ {ip} is reachable")

    return reachable_ips

def test_coap_port(ip, port=5683, timeout=2):
    """Test if a specific port is open on an IP"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except:
        return False

def test_common_ports(ip):
    """Test common ports that might be used by Philips Air Purifiers"""
    common_ports = [5683, 5684, 80, 443, 8080, 8443]
    open_ports = []

    for port in common_ports:
        if test_coap_port(ip, port):
            open_ports.append(port)

    return open_ports

async def test_aioairctrl_connection(ip, timeout=5):
    """Test if an IP responds to aioairctrl CoAP requests"""
    try:
        from aioairctrl import CoAPClient

        client = CoAPClient(ip)
        await asyncio.wait_for(client._init(), timeout=timeout)

        # Try to get status
        status = await asyncio.wait_for(client.get_status(), timeout=timeout)
        await client.shutdown()

        return True, status
    except Exception as e:
        return False, str(e)

async def main():
    """Main scanning function"""
    print("=== Philips Air Purifier Network Scanner ===\n")

    # Get local network information
    local_ip = get_local_ip()
    print(f"Local IP: {local_ip}")

    start_ip, end_ip = get_network_range(local_ip)
    print(f"Scanning network: {start_ip} - {end_ip}")

    # Scan for reachable IPs
    print("\n1. Scanning for reachable devices...")
    reachable_ips = scan_network_ips(start_ip, end_ip)

    if not reachable_ips:
        print("❌ No reachable devices found on the network")
        return

    print(f"\n✅ Found {len(reachable_ips)} reachable devices")

    # Test common ports on reachable devices
    print("\n2. Testing common ports on reachable devices...")
    potential_targets = []

    for ip in reachable_ips:
        open_ports = test_common_ports(ip)
        if open_ports:
            print(f"🔍 {ip}: Open ports {open_ports}")
            potential_targets.append((ip, open_ports))
        else:
            print(f"   {ip}: No common ports open")

    if not potential_targets:
        print("❌ No devices with open common ports found")
        return

    print(f"\n✅ Found {len(potential_targets)} potential targets")

    # Test aioairctrl connection on potential targets
    print("\n3. Testing aioairctrl connection on potential targets...")

    for ip, ports in potential_targets:
        print(f"\n🔍 Testing {ip} (ports: {ports})...")

        try:
            success, result = await asyncio.wait_for(
                test_aioairctrl_connection(ip), timeout=10
            )

            if success:
                print(f"🎉 SUCCESS! {ip} is a Philips Air Purifier!")
                print(f"   Status: {result}")
                print(f"   Recommended configuration:")
                print(f"     IP: {ip}")
                print(f"     Protocol: coaps")
                print(f"     Port: 5683 (default)")
            else:
                print(f"   ❌ Not a Philips Air Purifier: {result}")

        except asyncio.TimeoutError:
            print(f"   ⏰ Timeout testing {ip}")
        except Exception as e:
            print(f"   ❌ Error testing {ip}: {e}")

    print("\n=== Scan Complete ===")

if __name__ == "__main__":
    asyncio.run(main())
