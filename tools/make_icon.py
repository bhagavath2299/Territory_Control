#!/usr/bin/env python3
"""Make the iPhone app icon (1024 x 1024, no transparency) from the game's web-app icon.

    python3 tools/make_icon.py <icon-512.png>

iOS draws every home-screen size from this one picture and rounds the corners itself.
The web build only ships a 512 px icon, so it is enlarged here; on the phone (180 px)
it looks the same. For the App Store, render a fresh 1024 px icon from the logo source.
"""
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "TerritoryControl/Assets.xcassets/AppIcon.appiconset/icon-1024.png"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    icon = Image.open(sys.argv[1]).convert("RGB")  # App icons must be opaque
    icon = icon.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon.save(OUT, optimize=True)
    print(f"{OUT.relative_to(ROOT)} written ({OUT.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
