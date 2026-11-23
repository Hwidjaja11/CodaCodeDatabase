#!/usr/bin/env python3
"""Rebuild the ID cards for the RESTRICTED section.

  CODA_RESTRICTED_PASSWORD=... python3 tools/build_cards.py          # normal rebuild
  CODA_RESTRICTED_PASSWORD=... python3 tools/build_cards.py --rekey  # password changed: re-encrypt everything

What it does:
  1. Draws one card per person in docs/data/people.json (tools/cards/gen.py + shoot.js, needs Playwright).
  2. Encrypts each PNG with AES-256-GCM (key from the restricted password, PBKDF2-SHA256) and saves it as
     docs/restricted/cards/*.enc. The repo is public, so the cards are never stored unencrypted.
  3. Updates docs/restricted/cards.json. A card's "made" date is kept forever; its "updated" date only
     changes when the picture actually changes (compared by SHA-256), so dates are always honest.
The password is never written to disk.
"""
import datetime, getpass, hashlib, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "restricted"
MANIFEST = OUT / "cards.json"
ITER = 250_000


def derive(password, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(password.encode())


def render(work):
    shutil.copy(ROOT / "docs" / "data" / "people.json", work / "people.json")
    shutil.copy(ROOT / "tools" / "cards" / "logo.png", work / "logo.png")
    subprocess.run([sys.executable, str(ROOT / "tools" / "cards" / "gen.py")], cwd=work, check=True)
    subprocess.run(["node", str(ROOT / "tools" / "cards" / "shoot.js")], cwd=work, check=True)
    return sorted(work.glob("CodaCode-Card-*.png"))


def main():
    rekey = "--rekey" in sys.argv
    password = os.environ.get("CODA_RESTRICTED_PASSWORD") or getpass.getpass("Restricted password: ")
    old = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"cards": []}
    prev = {c["download"]: c for c in old["cards"]}
    salt = bytes.fromhex(old["salt"]) if old.get("salt") and not rekey else os.urandom(16)
    key = derive(password, salt)
    today = datetime.date.today().isoformat()

    with tempfile.TemporaryDirectory() as t:
        pngs = render(Path(t))
        cards, keep = [], set()
        for png in pngs:
            data = png.read_bytes()
            sha = hashlib.sha256(data).hexdigest()
            name = png.stem.split("-", 3)[3]
            enc_name = "cards/" + png.stem.lower() + ".enc"
            old_c = prev.get(png.name)
            same = old_c and old_c["sha256"] == sha and (OUT / enc_name).exists() and not rekey
            if not same:
                iv = os.urandom(12)
                (OUT / enc_name).write_bytes(iv + AESGCM(key).encrypt(iv, data, None))
            made = old_c["made"] if old_c else today
            updated = old_c["updated"] if same else (today if old_c else made)
            cards.append({"name": name, "download": png.name, "file": enc_name, "sha256": sha, "made": made, "updated": updated})
            keep.add(enc_name)
    for f in (OUT / "cards").glob("*.enc"):
        if "cards/" + f.name not in keep:
            f.unlink()
    MANIFEST.write_text(json.dumps({"kdf": "PBKDF2-SHA256", "iterations": ITER, "salt": salt.hex(), "cards": cards}, indent=2) + "\n")
    print(f"{len(cards)} cards written ({sum(1 for c in cards if c['updated'] == today)} new or changed today)")


if __name__ == "__main__":
    main()
