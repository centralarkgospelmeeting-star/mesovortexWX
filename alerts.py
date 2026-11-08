#!/usr/bin/env python3
"""MesoVortexWX Phase 1: list active NWS alerts for a location.
Usage: python alerts.py 34.7465 -92.2896
Source: api.weather.gov (National Weather Service).
"""
import sys
import requests

# NWS asks for a contact in the User-Agent. Replace this with your own email.
HEADERS = {
    "User-Agent": "MesoVortexWX/0.1 (your-email@example.com)",
    "Accept": "application/geo+json",
}


def main():
    if len(sys.argv) != 3:
        print("Usage: python alerts.py LAT LON")
        sys.exit(1)
    lat, lon = sys.argv[1], sys.argv[2]
    r = requests.get("https://api.weather.gov/alerts/active",
                     params={"point": f"{lat},{lon}"},
                     headers=HEADERS, timeout=15)
    r.raise_for_status()
    features = r.json().get("features", [])
    if not features:
        print("No active alerts for this location.")
    for f in features:
        p = f["properties"]
        print(f"{p.get('event')} | severity: {p.get('severity')} | expires: {p.get('expires')}")
        print(f"  {p.get('headline')}")
        print(f"  Source: {p.get('senderName')}\n")


if __name__ == "__main__":
    main()
