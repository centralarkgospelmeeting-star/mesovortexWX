#!/usr/bin/env python3
"""MesoVortexWX Phase 1: build the dashboard data.
Usage: python build_dashboard.py KLZK
Writes dashboard/KLZK_reflectivity.png and dashboard/data.js.
"""
import sys
import os
import gzip
import json
import tempfile
from datetime import datetime, timezone

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pyart

from nexrad_latest import find_latest_key, BUCKET

OUT_DIR = "dashboard"


def main():
    site = (sys.argv[1] if len(sys.argv) > 1 else "KLZK").upper()
    os.makedirs(OUT_DIR, exist_ok=True)

    s3, key = find_latest_key(site)
    print("Downloading", key)
    raw = s3.get_object(Bucket=BUCKET, Key=key)["Body"].read()
    if key.endswith(".gz"):
        raw = gzip.decompress(raw)

    # File names look like KLZK20261107_181234_V06, so the scan time is in the name.
    name = key.split("/")[-1]
    scan_time = datetime.strptime(name[4:19], "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)

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
    plt.title(f"{site} base reflectivity (lowest tilt)")

    image_name = f"{site}_reflectivity.png"
    fig.savefig(os.path.join(OUT_DIR, image_name), dpi=150, bbox_inches="tight")
    plt.close(fig)

    data = {
        "site": site,
        "image": image_name,
        "scan_time_utc": scan_time.isoformat(),
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "radar": "NOAA/Unidata NEXRAD Level II (AWS Open Data)",
        },
    }
    # Written as a .js file so the dashboard page works when opened directly.
    with open(os.path.join(OUT_DIR, "data.js"), "w") as f:
        f.write("window.RADAR_DATA = " + json.dumps(data, indent=2) + ";\n")

    print("Saved", os.path.join(OUT_DIR, image_name))
    print("Saved", os.path.join(OUT_DIR, "data.js"))


if __name__ == "__main__":
    main()
