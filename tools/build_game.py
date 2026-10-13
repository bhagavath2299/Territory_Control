#!/usr/bin/env python3
"""Build the Territory Control game page from its parts in game/.

    python3 tools/build_game.py                 # writes dist/index.html (the web page, as on GitHub Pages)
    python3 tools/build_game.py --app           # also refreshes www/index.html for the iPhone app (via sync_web.py)
    python3 tools/build_game.py --split <page>  # one-off: cut an existing built page back into parts

The page is one file: HTML and CSS, the match engine (shared with the server: everything up to the
//@@client marker), three.js, then the phone-side code. Each part is a plain text file; the build joins them
with newlines, in the order of PARTS, so the result is exactly the page that was split.
"""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = ROOT / "game"
DIST = ROOT / "dist"

# (file, first line, last line) in the page the parts were cut from (app-test 8861220); the build only uses the order.
# v19 dropped texdata.js (the ground pictures of the old terrain, lines 7721-7739): the void arena draws its floor in a shader.
PARTS = [
    ("page_head.html", 1, 223),          # <head>, CSS, the page's HTML, <script>
    ("engine.js", 224, 702),             # match engine, shared with the server
    ("client_marker.js", 703, 703),      # //@@client: the server reads up to here
    ("vendor/three.r180.min.js", 704, 7244),
    ("gfx_core.js", 7245, 7720),         # helpers, online client, 3D renderer part 1
    ("gfx_world.js", 7740, 9185),        # 3D renderer parts 2-7: arena, cars, trails, effects, camera, garage
    ("ui.js", 9186, 10093),              # HUD, input, loops, events, screens, sound
    ("main.js", 10094, 10271),           # main loop, picture quality, boot
    ("page_tail.html", 10272, 10276),    # //@@end, </script>, service worker, end of page
]


def split(page: pathlib.Path) -> None:
    lines = page.read_text(encoding="utf-8").split("\n")
    if len(lines) != PARTS[-1][2]:  # only for pages of the old layout
        sys.exit(f"stop: {page} has {len(lines)} lines, the part table expects {PARTS[-1][2]}")
    for name, a, b in PARTS:
        out = GAME / name
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text("\n".join(lines[a - 1:b]), encoding="utf-8")
    print(f"split {page} into {len(PARTS)} parts in game/")


def build() -> pathlib.Path:
    text = "\n".join((GAME / name).read_text(encoding="utf-8") for name, _, _ in PARTS if (GAME / name).exists())
    DIST.mkdir(exist_ok=True)
    out = DIST / "index.html"
    out.write_text(text, encoding="utf-8")
    print(f"dist/index.html written ({len(text.encode('utf-8')):,} bytes)")
    return out


def main() -> int:
    if len(sys.argv) >= 3 and sys.argv[1] == "--split":
        split(pathlib.Path(sys.argv[2]))
        return 0
    build()
    if "--app" in sys.argv:
        label = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--label=")), "game/ build")
        return subprocess.call([sys.executable, str(ROOT / "tools/sync_web.py"), str(DIST), label])
    return 0


if __name__ == "__main__":
    sys.exit(main())
