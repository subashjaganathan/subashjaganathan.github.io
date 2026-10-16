#!/usr/bin/env python3
"""Build assets/data/threatmap.json for the live C2 threat map (stdlib only).

Data sources (no API keys, no attribution obligations):
  * abuse.ch ThreatFox, recent IOCs export ........... CC0
  * IPtoASN ip2country-v4 (iptoasn.com) .............. Public Domain (PDDL v1.0)
  * scripts/data/country-centroids.csv ............... from google/dspl canonical countries.csv

Keeps ip:port indicators first seen in the last WINDOW_HOURS, geolocates them to a country,
masks the last two octets, and writes a small JSON the browser replays. Run on a schedule by
.github/workflows/threatmap.yml; for local testing pass cached copies:

    python scripts/build_threatmap.py [threatfox_recent.json] [ip2country-v4.tsv.gz]
"""
import bisect
import collections
import csv
import datetime as dt
import gzip
import io
import json
import os
import sys
import urllib.request

THREATFOX = "https://threatfox.abuse.ch/export/json/recent/"
IP2COUNTRY = "https://iptoasn.com/data/ip2country-v4.tsv.gz"
WINDOW_HOURS = 48
MAX_EVENTS = 1500
TOP_FAMILIES = 8

HERE = os.path.dirname(os.path.abspath(__file__))
CENTROIDS = os.path.join(HERE, "data", "country-centroids.csv")
OUT = os.path.join(HERE, "..", "assets", "data", "threatmap.json")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "subashjaganathan.github.io threat-map"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def ip_int(ip):
    a, b, c, d = (int(x) for x in ip.split("."))
    return (a << 24) | (b << 16) | (c << 8) | d


def load_geo(raw_gz):
    starts, ends, ccs = [], [], []
    with gzip.open(io.BytesIO(raw_gz), "rt", encoding="utf-8") as f:
        for line in f:
            s, e, cc = line.rstrip("\n").split("\t")
            if cc == "None" or ":" in s:
                continue
            starts.append(ip_int(s)); ends.append(ip_int(e)); ccs.append(cc)
    return starts, ends, ccs


def main():
    tf_raw = open(sys.argv[1], "rb").read() if len(sys.argv) > 1 else fetch(THREATFOX)
    geo_raw = open(sys.argv[2], "rb").read() if len(sys.argv) > 2 else fetch(IP2COUNTRY)

    feed = json.loads(tf_raw)
    rows = [r for v in feed.values() for r in (v if isinstance(v, list) else [v])]
    starts, ends, ccs = load_geo(geo_raw)
    cents = {r["country"]: (float(r["latitude"]), float(r["longitude"]), r["name"])
             for r in csv.DictReader(open(CENTROIDS, encoding="utf-8")) if r["latitude"]}

    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    since = now - dt.timedelta(hours=WINDOW_HOURS)

    def seen(r):
        try:
            return dt.datetime.strptime(r["first_seen_utc"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=dt.timezone.utc)
        except (KeyError, TypeError, ValueError):
            return None

    window = [(seen(r), r) for r in rows]
    window = [(t, r) for t, r in window if t and t >= since]

    events, seen_ioc, unlocated = [], set(), 0
    for t, r in window:
        if r.get("ioc_type") != "ip:port" or r["ioc_value"] in seen_ioc:
            continue
        seen_ioc.add(r["ioc_value"])
        ip, _, port = r["ioc_value"].rpartition(":")
        try:
            n = ip_int(ip)
        except ValueError:
            continue
        i = bisect.bisect_right(starts, n) - 1
        cc = ccs[i] if i >= 0 and n <= ends[i] else None
        if cc not in cents:
            unlocated += 1
            continue
        fam = (r.get("malware_printable") or "Unknown").replace("Unknown malware", "Unknown")
        o = ip.split(".")
        events.append((t, cc, fam, f"{o[0]}.{o[1]}.x.x", int(port) if port.isdigit() else 0))

    events.sort(key=lambda e: e[0])
    fam_count = collections.Counter(e[2] for e in events)
    top = [f for f, _ in fam_count.most_common(TOP_FAMILIES)]
    fam_idx = {f: i for i, f in enumerate(top)}
    families = [[f, fam_count[f]] for f in top]
    other = sum(c for f, c in fam_count.items() if f not in fam_idx)
    if other:
        families.append(["Other", other])

    by_cc = collections.defaultdict(collections.Counter)
    for _, cc, fam, _, _ in events:
        by_cc[cc][fam_idx.get(fam, len(top))] += 1
    order = sorted(by_cc, key=lambda c: -sum(by_cc[c].values()))
    cc_idx = {c: i for i, c in enumerate(order)}
    countries = [[c, cents[c][2], round(cents[c][0], 2), round(cents[c][1], 2),
                  sum(by_cc[c].values()), by_cc[c].most_common(1)[0][0]] for c in order]

    recent = events[-MAX_EVENTS:]
    out = {
        "generated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "windowHours": WINDOW_HOURS,
        "source": "abuse.ch ThreatFox",
        "totals": {"c2": len(events), "countries": len(countries), "families": len(fam_count),
                   "iocs": len(window), "unlocated": unlocated},
        "families": families,
        "countries": countries,
        # [seconds before generated, country index, family index, masked ip, port]
        "events": [[int((now - t).total_seconds()), cc_idx[cc], fam_idx.get(fam, len(top)), ip, port]
                   for t, cc, fam, ip, port in recent],
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"threatmap: {len(events)} C2 in {WINDOW_HOURS}h across {len(countries)} countries, "
          f"{len(fam_count)} families, {len(recent)} events kept, {unlocated} unlocated -> {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()
