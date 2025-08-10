#!/usr/bin/env python3

import sys
import json
from pyairctrl import coap_client, http_client

def get_client(ip, protocol):
    if protocol == "coap":
        return coap_client.CoAPClient(ip)
    elif protocol == "coaps":
        return coap_client.CoAPClient(ip, True) # encrypted CoAP
    elif protocol == "http":
        return http_client.HTTPClient(ip)
    else:
        raise ValueError(f"Unsupported protocol: {protocol}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: get_status.py <ip> <protocol>"}))
        sys.exit(1)

    ip = sys.argv[1]
    protocol = sys.argv[2]

    try:
        client = get_client(ip, protocol)
        status = client.get_status()
        print(json.dumps(status))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)