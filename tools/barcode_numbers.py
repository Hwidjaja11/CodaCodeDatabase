#!/usr/bin/env python3
"""Print every person's 16-digit barcode number.

Layout (digits):  PP L DD A RR RR RR RR CC
  PP = person number (the "num" in docs/data/people.json)
  L  = executive level (0 = none, 1-4)
  DD = department flags added together (Music 1, Art 2, Ideas 4, Writing 8, Programming 16)
  A  = 1 if they work across all departments, else 0
  RR = the first four main roles (numbers from docs/data/codes.json, 00 = empty)
  CC = check digits (the first 14 digits modulo 97)

The Barcode Lookup page (docs/javascripts/barcode.js) uses the same rules.
Usage: python3 tools/barcode_numbers.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "docs", "data")


def load():
    people = json.load(open(os.path.join(DATA, "people.json"), encoding="utf-8"))
    codes = json.load(open(os.path.join(DATA, "codes.json"), encoding="utf-8"))
    return people, codes


def barcode_number(p, codes):
    mask = sum(codes["departments"].get(d, 0) for d in p["departments"])
    s = f'{p["num"]:02d}{p["rank"] or 0}{mask:02d}{1 if p.get("all") else 0}'
    for i in range(4):
        r = p["roles"][i] if i < len(p["roles"]) else None
        s += f'{(codes["roles"].index(r) + 1) if r else 0:02d}'
    return s + f"{int(s) % 97:02d}"


def grouped(n):
    return " ".join(n[i:i + 4] for i in range(0, len(n), 4))


if __name__ == "__main__":
    people, codes = load()
    for p in people:
        print(f'{p["name"]:<16} {grouped(barcode_number(p, codes))}')
