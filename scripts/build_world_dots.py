#!/usr/bin/env python3
"""Rasterise Natural Earth 1:110m land (public domain) into the dot-matrix grid used by
the threat map. Run once; the output (assets/data/world-dots.json) is committed.

    python scripts/build_world_dots.py [path/to/ne_110m_land.geojson]

Without an argument the GeoJSON is downloaded from the natural-earth-vector repository.
Grid: equirectangular, 1.8 degree cells, latitudes 80N..60S (Antarctica cropped).
"""
import base64
import json
import os
import sys
import urllib.request

SRC = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson"
STEP, LAT0, LAT1 = 1.8, 80.0, -60.0
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "data", "world-dots.json")


def load(path):
    if path:
        return json.load(open(path, encoding="utf-8"))
    with urllib.request.urlopen(SRC, timeout=60) as r:
        return json.load(r)


def polygons(geo):
    for f in geo["features"]:
        g = f["geometry"]
        if g["type"] == "Polygon":
            yield g["coordinates"]
        elif g["type"] == "MultiPolygon":
            yield from g["coordinates"]


def inside(x, y, ring):
    hit = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def main():
    geo = load(sys.argv[1] if len(sys.argv) > 1 else None)
    polys = []
    for rings in polygons(geo):
        xs = [p[0] for p in rings[0]]
        ys = [p[1] for p in rings[0]]
        polys.append((min(xs), max(xs), min(ys), max(ys), rings))

    w = int(round(360 / STEP))
    h = int(round((LAT0 - LAT1) / STEP))
    bits = bytearray((w * h + 7) // 8)
    land = 0
    for row in range(h):
        lat = LAT0 - (row + 0.5) * STEP
        for col in range(w):
            lon = -180 + (col + 0.5) * STEP
            for x0, x1, y0, y1, rings in polys:
                if x0 <= lon <= x1 and y0 <= lat <= y1 and inside(lon, lat, rings[0]) \
                        and not any(inside(lon, lat, hole) for hole in rings[1:]):
                    k = row * w + col
                    bits[k >> 3] |= 1 << (k & 7)
                    land += 1
                    break

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"w": w, "h": h, "step": STEP, "lat0": LAT0, "bits": base64.b64encode(bytes(bits)).decode()}, f)
    print(f"world-dots: {w}x{h} grid, {land} land cells -> {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()
