#!/usr/bin/env python3
"""MesoVortexWX Phase 1: fetch the latest NEXRAD Level II scan and plot base reflectivity.
Usage: python nexrad_latest.py KLZK
Data: NOAA/Unidata NEXRAD Level II archive on AWS Open Data (public, no account needed).
"""
import sys
import os
import gzip
import tempfile
from datetime import datetime, timezone, timedelta

import boto3
from botocore import UNSIGNED
from botocore.config import Config
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pyart

BUCKET = "unidata-nexrad-level2"


def find_latest_key(site):
    """Return (s3_client, key) for the newest scan of this radar site."""
    s3 = boto3.client("s3", config=Config(signature_version=UNSIGNED))
    now = datetime.now(timezone.utc)
    for days_back in (0, 1):  # check today, then yesterday (covers UTC midnight)
        day = now - timedelta(days=days_back)
        prefix = f"{day:%Y/%m/%d}/{site}/"
        keys = []
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=prefix):
            for obj in page.get("Contents", []):
                if "_MDM" not in obj["Key"]:  # skip metadata files
                    keys.append(obj["Key"])
        if keys:
            return s3, sorted(keys)[-1]  # file names contain the timestamp, so sorting finds the newest
    raise RuntimeError(f"No recent scans found for {site}")


def main():
    site = (sys.argv[1] if len(sys.argv) > 1 else "KLZK").upper()
    s3, key = find_latest_key(site)
    print("Downloading", key)

    raw = s3.get_object(Bucket=BUCKET, Key=key)["Body"].read()
    if key.endswith(".gz"):
        raw = gzip.decompress(raw)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".ar2v") as tmp:
        tmp.write(raw)
        path = tmp.name
    try:
        radar = pyart.io.read_nexrad_archive(path)
    finally:
        os.remove(path)

    display = pyart.graph.RadarDisplay(radar)
    fig = plt.figure(figsize=(8, 8))
    display.plot_ppi("reflectivity", sweep=0, vmin=-10, vmax=70,
                     fig=fig, cmap="pyart_NWSRef")
    display.set_limits((-150, 150), (-150, 150))  # about 150 km around the radar
    plt.title(f"{site} base reflectivity (lowest tilt)\n{key.split('/')[-1]}")

    out = f"{site}_reflectivity.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    print("Saved", out)


if __name__ == "__main__":
    main()
