import os
import xml.etree.ElementTree as ET
import requests
import time
import sys

SITEMAP_URL = "https://upxuu.com/sitemap.xml"
INDEXNOW_URL = "https://api.indexnow.org/IndexNow"
HOST = "upxuu.com"
KEY = os.environ.get("INDEXNOW_KEY", "")
if not KEY:
    print("ERROR: Set INDEXNOW_KEY environment variable first")
    sys.exit(1)
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
BATCH_SIZE = 10000


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def check_key_file():
    log(f"Checking key file at {KEY_LOCATION} ...")
    try:
        r = requests.get(KEY_LOCATION, timeout=15)
        log(f"  Key file status: {r.status_code}")
        log(f"  Key file content: {r.text.strip()}")
        if r.status_code != 200:
            log("  WARNING: Key file not accessible! Deploy the site first.")
        if r.text.strip() != KEY:
            log("  WARNING: Key file content does not match!")
    except Exception as e:
        log(f"  ERROR fetching key file: {e}")


def fetch_sitemap_urls():
    log(f"Fetching sitemap from {SITEMAP_URL} ...")
    resp = requests.get(SITEMAP_URL, timeout=30)
    resp.raise_for_status()
    root = ET.fromstring(resp.content)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [url.find("sm:loc", ns).text for url in root.findall("sm:url", ns)]
    log(f"Fetched {len(urls)} URLs from sitemap")
    log(f"  First URL: {urls[0]}")
    log(f"  Last URL:  {urls[-1]}")
    return urls


def submit_batch(urls, batch_num):
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }
    log(f"Sending batch {batch_num} ({len(urls)} URLs) to {INDEXNOW_URL} ...")
    log(f"  Host: {payload['host']}")
    log(f"  Key: {payload['key']}")
    log(f"  KeyLocation: {payload['keyLocation']}")
    log(f"  URL count: {len(payload['urlList'])}")
    log(f"  First URL in batch: {payload['urlList'][0]}")
    log(f"  Last URL in batch:  {payload['urlList'][-1]}")

    try:
        resp = requests.post(INDEXNOW_URL, json=payload, timeout=60)
        log(f"  Response status: {resp.status_code}")
        try:
            log(f"  Response body: {resp.text}")
        except Exception:
            log(f"  Response body: (non-printable/{len(resp.content)} bytes)")
        if resp.status_code == 200:
            log("  RESULT: SUCCESS - URLs submitted successfully")
            return True
        elif resp.status_code == 400:
            log("  RESULT: FAILED - Invalid format (bad request)")
        elif resp.status_code == 403:
            log("  RESULT: FAILED - Key not valid (403 Forbidden)")
        elif resp.status_code == 422:
            log("  RESULT: FAILED - URLs don't belong to host or key mismatch")
        else:
            log(f"  RESULT: FAILED - Unexpected status code")
        return False
    except requests.exceptions.Timeout:
        log("  ERROR: Request timed out after 60s")
        return False
    except requests.exceptions.ConnectionError as e:
        log(f"  ERROR: Connection failed: {e}")
        return False
    except Exception as e:
        log(f"  ERROR: {e}")
        return False


def main():
    log("=" * 50)
    log("IndexNow URL Submitter")
    log("=" * 50)

    check_key_file()

    urls = fetch_sitemap_urls()

    if not urls:
        log("No URLs found in sitemap. Exiting.")
        sys.exit(1)

    success_count = 0
    fail_count = 0
    total_batches = (len(urls) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(urls), BATCH_SIZE):
        batch = urls[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        log(f"\n--- Batch {batch_num}/{total_batches} ---")
        if submit_batch(batch, batch_num):
            success_count += len(batch)
        else:
            fail_count += len(batch)
        if i + BATCH_SIZE < len(urls):
            time.sleep(1)

    log("\n" + "=" * 50)
    log(f"SUMMARY: {success_count} succeeded, {fail_count} failed out of {len(urls)} total URLs")
    log("=" * 50)


if __name__ == "__main__":
    main()
