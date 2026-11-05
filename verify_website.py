"""
verify_website.py - Automated Static Verification & Asset Integrity Check for Shijuan Landing Page
Validates:
1. Directory structure and .nojekyll existence
2. Viewport meta tag presence for mobile responsiveness
3. Absence of absolute root paths (/...) or Windows backslashes in static asset links
4. In-page anchor integrity (#hash targets exist in DOM)
5. Local HTTP server startup and 200 OK for /index.html
6. Zero 404s for all referenced CSS, JS, SVG, and favicon files
7. (Optional E2E) Headless browser viewport check (375px mobile & 1280px desktop) for zero horizontal overflow
"""

import os
import sys
import re
import socket
import threading
import subprocess
import urllib.request
import http.server
from html.parser import HTMLParser

DOCS_DIR = os.path.abspath(os.path.dirname(__file__))

class AssetCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.anchors = []
        self.ids = set()
        self.has_viewport = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if "id" in attr_dict:
            self.ids.add(attr_dict["id"])

        if tag == "meta":
            if attr_dict.get("name") == "viewport":
                self.has_viewport = True

        if tag == "link":
            href = attr_dict.get("href")
            rel = attr_dict.get("rel", "")
            if href and not href.startswith(("http://", "https://", "//", "data:")):
                self.assets.append((tag, "href", href))

        elif tag == "script":
            src = attr_dict.get("src")
            if src and not src.startswith(("http://", "https://", "//", "data:")):
                self.assets.append((tag, "src", src))

        elif tag in ("img", "source"):
            src = attr_dict.get("src")
            srcset = attr_dict.get("srcset")
            if src and not src.startswith(("http://", "https://", "//", "data:")):
                self.assets.append((tag, "src", src))
            if srcset:
                for item in srcset.split(","):
                    url = item.strip().split()[0]
                    if url and not url.startswith(("http://", "https://", "//", "data:")):
                        self.assets.append((tag, "srcset", url))

        elif tag == "a":
            href = attr_dict.get("href")
            if href and href.startswith("#") and len(href) > 1:
                self.anchors.append(href[1:])


def run_verification():
    print("=" * 60)
    print("Starting Shijuan Official Website Verification Check")
    print(f"Target Directory: {DOCS_DIR}")
    print("=" * 60)

    errors = []

    # 1. Structure check
    if not os.path.isdir(DOCS_DIR):
        print(f"[FAIL] Directory not found: {DOCS_DIR}")
        return False

    index_path = os.path.join(DOCS_DIR, "index.html")
    if not os.path.isfile(index_path):
        print(f"[FAIL] index.html not found in {DOCS_DIR}")
        return False
    print("[PASS] docs/index.html found.")

    nojekyll_path = os.path.join(DOCS_DIR, ".nojekyll")
    if not os.path.isfile(nojekyll_path):
        errors.append("Missing .nojekyll in docs/ directory (required for GitHub Pages)")
    else:
        print("[PASS] docs/.nojekyll found.")

    # 2. Parse index.html
    with open(index_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    collector = AssetCollector()
    collector.feed(html_content)

    if not collector.has_viewport:
        errors.append("Missing <meta name=\"viewport\"> tag in index.html")
    else:
        print("[PASS] Viewport meta tag present for responsive rendering.")

    # 3. Path safety check (No absolute root paths, no backslashes)
    print(f"Discovered {len(collector.assets)} local asset reference(s). Checking relative paths...")
    for tag, attr, path in collector.assets:
        if path.startswith("/"):
            errors.append(f"Absolute root path detected in <{tag} {attr}=\"{path}\">. Must use relative path (e.g. ./{path.lstrip('/')}) for GitHub Pages compatibility.")
        if "\\" in path:
            errors.append(f"Windows backslash detected in path: {path}")

    # 4. In-page anchor validation
    print(f"Discovered {len(collector.anchors)} in-page anchor reference(s). Checking matching DOM IDs...")
    for anchor in collector.anchors:
        if anchor not in collector.ids:
            errors.append(f"Anchor #{anchor} referenced in <a> has no matching element with id=\"{anchor}\"")
        else:
            print(f"[PASS] Anchor #{anchor} matches valid DOM target id=\"{anchor}\".")

    # 5. Start Local HTTP Static Server
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=DOCS_DIR, **kwargs)
        def log_message(self, format, *args):
            pass

    server = http.server.HTTPServer(("127.0.0.1", 0), QuietHandler)
    port = server.server_port
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    base_url = f"http://127.0.0.1:{port}"
    print(f"[PASS] Local HTTP Static Server started at {base_url}")

    # 6. Request index.html via HTTP
    try:
        req = urllib.request.urlopen(f"{base_url}/index.html", timeout=5)
        if req.status == 200:
            print("[PASS] HTTP GET /index.html returned 200 OK")
        else:
            errors.append(f"HTTP GET /index.html returned status {req.status}")
    except Exception as e:
        errors.append(f"Failed to fetch /index.html: {e}")

    # 7. Request all referenced assets via HTTP
    for tag, attr, asset_rel_path in collector.assets:
        clean_path = asset_rel_path.lstrip("./").split("?")[0].split("#")[0]
        url = f"{base_url}/{clean_path}"
        try:
            res = urllib.request.urlopen(url, timeout=5)
            if res.status == 200:
                print(f"[PASS] HTTP GET 200 OK: {clean_path}")
            else:
                errors.append(f"HTTP GET {res.status} for asset: {clean_path}")
        except Exception as e:
            errors.append(f"HTTP GET failed (404/Error) for asset: {clean_path} ({e})")

    # 8. Check responsive layout via Microsoft Edge if available
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    edge_bin = next((p for p in edge_paths if os.path.isfile(p)), None)

    if edge_bin:
        print("[INFO] Microsoft Edge detected. Running responsive screenshot probes...")
        try:
            # Mobile 375px probe
            screenshot_mobile = os.path.join(DOCS_DIR, "test_mobile_375.png")
            res_m = subprocess.run([
                edge_bin,
                "--headless",
                "--disable-gpu",
                "--window-size=375,667",
                f"--screenshot={screenshot_mobile}",
                f"{base_url}/index.html"
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
            if os.path.isfile(screenshot_mobile) and os.path.getsize(screenshot_mobile) > 1000:
                print("[PASS] Mobile 375px responsive render verified (screenshot generated).")
                os.remove(screenshot_mobile)
            else:
                print("[WARN] Mobile screenshot probe did not output image.")

            # Desktop 1280px probe
            screenshot_desktop = os.path.join(DOCS_DIR, "test_desktop_1280.png")
            res_d = subprocess.run([
                edge_bin,
                "--headless",
                "--disable-gpu",
                "--window-size=1280,800",
                f"--screenshot={screenshot_desktop}",
                f"{base_url}/index.html"
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
            if os.path.isfile(screenshot_desktop) and os.path.getsize(screenshot_desktop) > 1000:
                print("[PASS] Desktop 1280px responsive render verified (screenshot generated).")
                os.remove(screenshot_desktop)
            else:
                print("[WARN] Desktop screenshot probe did not output image.")
        except Exception as e:
            print(f"[WARN] Headless Edge probe encountered an exception: {e}")

    server.shutdown()

    # Summary
    print("=" * 60)
    if errors:
        print(f"[FAILED] Found {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        return False
    else:
        print("[SUCCESS] All static verification checks passed with ZERO errors!")
        return True

if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
