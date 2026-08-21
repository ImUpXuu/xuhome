#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Replace old image hosts with the new one, and convert legacy
jpg/png images (which only exist as .webp on the new host) to .webp.

Rules (verified against the live image host on 2026-08-16):
  - https://img.upxuu.com/images/<p>.<ext>    -> https://img.upxuu.lcrworld.xyz/images/<p>.<ext>
  - https://img.476543.xyz/img/<p>.<ext>      -> https://img.upxuu.lcrworld.xyz/images/<p>.<ext>
  - legacy jpg/png from img.upxuu.com (except /2026/8/*) and
    img.476543.xyz 2026/7/22/20260722122924_577.png only exist as .webp
    on the new host -> extension becomes .webp.
Byte-preserving read/write (utf-8, no newline/BOM mangling).
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "src", "content")
LAYOUT = os.path.join(ROOT, "src", "layouts", "Layout.astro")

OLD_HOST = "img.upxuu.com"
NEW_HOST = "img.upxuu.lcrworld.xyz"
XYZ_PREFIX = "https://img.476543.xyz/img/"
NEW_IMAGES_PREFIX = "https://" + NEW_HOST + "/images/"

# Legacy images that only exist as .webp on the new host.
# Set 1: img.upxuu.com jpg/png NOT under /2026/8/
WEBP_SET = set()


def _inside(base, p):
    """p 是否落在 base 目录内（防路径穿越，只允许改内容目录内的文件）。"""
    abs_base = os.path.abspath(base)
    return os.path.abspath(p).startswith(abs_base + os.sep)


def collect_upxuu_urls():
    """Extract all https://img.upxuu.com/images/... URLs from content files."""
    found = set()
    for dirpath, _dirs, files in os.walk(CONTENT):
        for name in files:
            p = os.path.join(dirpath, name)
            try:
                with open(p, "rb") as f:
                    data = f.read()
            except OSError:
                continue
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                print("SKIP (not utf-8):", p)
                continue
            base = "https://" + OLD_HOST + "/images/"
            i = 0
            while True:
                i = text.find(base, i)
                if i == -1:
                    break
                j = i + len(base)
                while j < len(text) and (text[j].isalnum() or text[j] in "/_.-"):
                    j += 1
                found.add(text[i:j])
                i = j
    return found


def main():
    urls = collect_upxuu_urls()
    for u in sorted(urls):
        if u.endswith(".jpg") or u.endswith(".png"):
            # newer uploads (kept original extension) live under /2026/8/
            if "/2026/8/" in u:
                continue
            WEBP_SET.add(u)

    # Set 2: the single img.476543.xyz legacy png that exists only as webp
    WEBP_SET.add("https://img.476543.xyz/img/2026/7/22/20260722122924_577.png")

    print("Images to convert to .webp:", len(WEBP_SET))

    # Build old-URL -> new-URL mapping for the webp-only images
    mapping = {}
    for u in sorted(WEBP_SET):
        if u.startswith(XYZ_PREFIX):
            new = NEW_IMAGES_PREFIX + u[len(XYZ_PREFIX):]
        elif u.startswith("https://" + OLD_HOST + "/"):
            new = "https://" + NEW_HOST + "/" + u[len("https://" + OLD_HOST + "/"):]
        else:
            continue
        new = new.rsplit(".", 1)[0] + ".webp"
        mapping[u] = new

    targets = []
    for dirpath, _dirs, files in os.walk(CONTENT):
        for name in files:
            if name.endswith(".md"):
                targets.append(os.path.join(dirpath, name))
    targets.append(LAYOUT)

    total = 0
    for p in targets:
        with open(p, "rb") as f:
            data = f.read()
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            print("SKIP (not utf-8):", p)
            continue
        orig = text
        for old, new in mapping.items():
            text = text.replace(old, new)
        # generic host swap for everything else
        text = text.replace("https://" + OLD_HOST + "/images/",
                            "https://" + NEW_HOST + "/images/")
        text = text.replace(XYZ_PREFIX, NEW_IMAGES_PREFIX)
        if text != orig:
            # 只允许改写内容目录或固定布局文件，防止意外覆盖其它路径
            if not (_inside(CONTENT, p) or os.path.abspath(p) == os.path.abspath(LAYOUT)):
                print("SKIP (outside content):", os.path.relpath(p, ROOT))
                continue
            with open(p, "wb") as f:
                f.write(text.encode("utf-8"))
            total += 1
            print("updated:", os.path.relpath(p, ROOT))
    print("files updated:", total)


if __name__ == "__main__":
    main()
