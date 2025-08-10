#!/usr/bin/env python3

import sys
import json
import asyncio
from aioairctrl import CoAPAirClient, HTTPAirClient

async def get_client(ip, protocol):
    if protocol == "coap":
        return CoAPAirClient(ip)
    elif protocol == "coaps":
        return CoAPAirClient(ip, use_encryption=True)  # encrypted CoAP
    elif protocol == "http":
        return HTTPAirClient(ip)
    else:
        raise ValueError(f"Unsupported protocol: {protocol}")

async def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: get_status.py <ip> <protocol>"}))
        sys.exit(1)

    ip = sys.argv[1]
    protocol = sys.argv[2]

    try:
        client = await get_client(ip, protocol)
        status = await client.get_status()
        print(json.dumps(status))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())