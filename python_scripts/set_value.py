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
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: set_value.py <ip> <protocol> <key> <value>"}))
        sys.exit(1)

    ip = sys.argv[1]
    protocol = sys.argv[2]
    key = sys.argv[3]
    value_str = sys.argv[4]

    # Attempt to convert value to appropriate type (int, float, bool, or string)
    try:
        if value_str.lower() == "true":
            value = True
        elif value_str.lower() == "false":
            value = False
        elif value_str.isdigit():
            value = int(value_str)
        else:
            value = value_str
    except ValueError:
        value = value_str # Fallback to string if conversion fails

    try:
        client = get_client(ip, protocol)
        client.set_value(key, value)
        print(json.dumps({"success": True}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)