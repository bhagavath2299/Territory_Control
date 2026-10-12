#!/usr/bin/env python3
"""Copy a built Territory Control web app (the `app-test` build) into www/ for the iPhone app.

    python3 tools/sync_web.py <folder with the built index.html> [source label]

The iPhone app serves www/ from inside the app, so the parts that only matter to a web page
installed from Safari are taken out: the web-app manifest, the home-screen icon link and the
service worker (the app needs no download cache: every file is already on the phone).
The boot screen's footer says it is the iPhone app. Each change must match exactly once,
so a new web build that no longer fits stops this script instead of slipping through.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    src = pathlib.Path(sys.argv[1])
    label = sys.argv[2] if len(sys.argv) > 2 else src.name
    html = (src / "index.html").read_text(encoding="utf-8")

    edits = [
        ("web-app manifest link", r'<link rel="manifest" href="manifest\.webmanifest">\n?', ""),
        ("home-screen icon link", r'<link rel="apple-touch-icon" href="icons/apple-touch-icon\.png">\n?', ""),
        ("service worker", r'<script>if\("serviceWorker" in navigator&&[^<]*navigator\.serviceWorker\.register\("sw\.js"\)[^<]*</script>\n?', ""),
        ("page title", r"<title>Territory Control Mobile</title>", "<title>Territory Control</title>"),
        ("boot footer", r"TERRITORY CONTROL &middot; PHONE TEST BUILD", "TERRITORY CONTROL &middot; IPHONE APP TEST BUILD"),
    ]
    for name, pattern, repl in edits:
        html, n = re.subn(pattern, repl, html)
        if n != 1:
            print(f"stop: '{name}' matched {n} times (expected 1); the web build changed, check this edit")
            return 1

    # Where this copy came from, readable by the self-test and by anyone opening the file.
    head = '<meta charset="utf-8">'
    if html.count(head) != 1:
        print("stop: charset tag not found once")
        return 1
    html = html.replace(head, head + f'\n<meta name="tc-native-source" content="{label}">', 1)

    www = ROOT / "www"
    www.mkdir(exist_ok=True)
    for old in www.iterdir():
        if old.is_file():
            old.unlink()
    (www / "index.html").write_text(html, encoding="utf-8")
    print(f"www/index.html written ({len(html.encode('utf-8')):,} bytes) from {label}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
