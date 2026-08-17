#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
下载博客使用的 Google Fonts（Fredoka / Noto Sans SC / JetBrains Mono），
产出可整目录上传 CDN 的字体包：
  fonts-download/
    fonts.css              # @font-face，url 已改写为相对路径 ./woff2/xxx.woff2
    woff2/                 # 所有可变字体的 woff2 文件（每个子集一个）
"""
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

CSS_URL = (
    "https://fonts.googleapis.com/css2?"
    "family=Fredoka:wght@300..700"
    "&family=Noto+Sans+SC:wght@300..900"
    "&family=JetBrains+Mono:wght@400;500;600"
    "&display=swap"
)
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fonts-download")
WOFF_DIR = os.path.join(OUT_DIR, "woff2")
CSS_OUT = os.path.join(OUT_DIR, "fonts.css")

MAX_WORKERS = 6
RETRIES = 3


def fetch(url, headers=None, timeout=30):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def parse_font_faces(css):
    """逐个解析 @font-face { ... } 块，返回 (family, weight, url) 列表。"""
    out = []
    i = 0
    while True:
        start = css.find("@font-face", i)
        if start == -1:
            break
        brace = css.find("{", start)
        end = css.find("}", brace)
        if end == -1:
            break
        text = css[start:end + 1]
        fam = re.search(r"font-family:\s*['\"]([^'\"]+)['\"];", text)
        url = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)", text)
        wgt = re.search(r"font-weight:\s*([\d\s]+);", text)
        if fam and url:
            out.append({
                "family": fam.group(1),
                "url": url.group(1),
                "weight": wgt.group(1).strip() if wgt else "",
            })
        i = end + 1
    return out


def main():
    os.makedirs(WOFF_DIR, exist_ok=True)

    print("正在获取 Google Fonts CSS …")
    css = fetch(CSS_URL).decode("utf-8")
    print(f"CSS 获取成功，{len(css)} 字节")

    faces = parse_font_faces(css)
    # 去重（按 URL，同 family+url 只留一份）
    seen = {}
    for f in faces:
        key = (f["family"], f["url"])
        if key not in seen:
            seen[key] = f
    items = list(seen.values())
    print(f"解析出 {len(items)} 个字体文件")

    # 按家族分组、顺序编号命名
    counters = {}
    for it in items:
        fam = re.sub(r"[^A-Za-z0-9]+", "", it["family"]).lower()
        counters[fam] = counters.get(fam, 0) + 1
        it["file"] = f"{fam}-{counters[fam]:03d}.woff2"
        it["path"] = os.path.join(WOFF_DIR, it["file"])

    # 并发下载
    def dl(it):
        for attempt in range(1, RETRIES + 1):
            try:
                data = fetch(it["url"])
                with open(it["path"], "wb") as f:
                    f.write(data)
                return it["file"], len(data)
            except Exception as e:
                if attempt == RETRIES:
                    return it["file"], f"FAIL: {e}"
                time.sleep(1.5 * attempt)

    total = 0
    fails = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = {ex.submit(dl, it): it for it in items}
        for i, fut in enumerate(as_completed(futs), 1):
            name, size = fut.result()
            if isinstance(size, str):
                fails.append(f"{name}: {size}")
            else:
                total += size
            if i % 25 == 0 or i == len(items):
                print(f"  进度 {i}/{len(items)} …")

    print(f"下载完成：{len(items) - len(fails)}/{len(items)} 个文件，共 {total / 1024 / 1024:.1f} MB")
    if fails:
        print("失败：", *fails, sep="\n  ")

    # 改写 CSS → 相对路径
    url_map = {it["url"]: f"./woff2/{it['file']}" for it in items}
    new_css = css
    for u, local in url_map.items():
        new_css = new_css.replace(u, local)
    header = (
        "/* 自托管字体：请将整个 fonts-download 目录上传到 CDN，然后引用 fonts.css */\n"
        "/* 例如：<link rel=\"stylesheet\" href=\"https://你的域名/fonts/fonts.css\" /> */\n"
    )
    with open(CSS_OUT, "w", encoding="utf-8") as f:
        f.write(header + new_css)
    print(f"已生成 {os.path.relpath(CSS_OUT, os.getcwd())}")


if __name__ == "__main__":
    main()
