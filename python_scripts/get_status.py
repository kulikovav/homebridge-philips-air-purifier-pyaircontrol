#!/usr/bin/env python3

import sys
import json
import asyncio
from aioairctrl import CoAPClient

async def get_client(ip, protocol):
    if protocol in ["coap", "coaps"]:
        # aioairctrl only supports CoAP, coaps is handled by encryption
        use_encryption = (protocol == "coaps")
        return CoAPClient(ip, use_encryption=use_encryption)
    else:
        raise ValueError(f"Unsupported protocol: {protocol}. aioairctrl only supports CoAP/CoAPS")

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