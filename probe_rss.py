import json, urllib.request, urllib.error, ssl, re, time, signal, sys
from urllib.parse import urlparse

CONSOLE_ENC = 'gbk'
def safe_print(s, end='\n'):
    try:
        print(s, end=end, flush=True)
    except UnicodeEncodeError:
        safe = s.encode(CONSOLE_ENC, errors='replace').decode(CONSOLE_ENC, errors='replace')
        print(safe, end=end, flush=True)

ssl._create_default_https_context = ssl._create_unverified_context

with open('src/config/friends.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Load partial results if exist
partial = {}
try:
    with open('probe_rss_result.json', 'r', encoding='utf-8') as f:
        partial = json.load(f)
    found_sofar = {n: u for n, u in partial.get('found', [])}
    notfound_sofar = set(partial.get('not_found', []))
    safe_print(f'Loaded partial: {len(found_sofar)} found, {len(notfound_sofar)} not found')
except:
    found_sofar = {}
    notfound_sofar = set()

COMMON_PATHS = ['/rss.xml', '/feed.xml', '/feed', '/atom.xml', '/rss', '/index.xml']

def check_url(url, timeout=6):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=timeout)
        code = resp.getcode()
        body = resp.read(3000) if code == 200 else b''
        return code, body
    except Exception as e:
        return 0, b''

def is_feed(body):
    return body.startswith(b'<?xml') or b'<rss' in body[:500] or b'<feed' in body[:500] or b'xmlns:atom' in body[:500]

results_updated = False
for i, d in enumerate(data):
    name = d['name']
    if d.get('rss'):
        continue
    if name in found_sofar or name in notfound_sofar:
        continue
    
    url = d['url'].strip().rstrip('/')
    parsed = urlparse(url)
    base = f'{parsed.scheme}://{parsed.netloc}'
    
    safe_print(f'[{i+1}/{len(data)}] ', end='')
    safe_print(name, end='')
    found = None
    
    for p in COMMON_PATHS:
        test_url = f'{base}{p}'
        code, body = check_url(test_url)
        if 200 <= code < 400 and is_feed(body):
            found = test_url
            break
    
    if not found:
        code, body = check_url(f'{base}/')
        if code == 200:
            html = body.decode('utf-8', errors='replace')
            patterns = [
                r'href=["\']([^"\']*rss[^"\']*\.xml)["\']',
                r'href=["\']([^"\']*feed[^"\']*\.xml)["\']',
                r'href=["\']([^"\']*atom\.xml)["\']',
                r'href=["\']([^"\']*rss[^"\']*)["\']',
            ]
            for pat in patterns:
                matches = re.findall(pat, html, re.IGNORECASE)
                for m in matches:
                    if m.startswith('//'):
                        m = 'https:' + m
                    elif m.startswith('/'):
                        m = base + m
                    elif not m.startswith('http'):
                        m = base + '/' + m
                    code2, body2 = check_url(m)
                    if 200 <= code2 < 400 and is_feed(body2):
                        found = m
                        break
                if found:
                    break
    
    if found:
        found_sofar[name] = found
        safe_print(f' -> {found}')
    else:
        notfound_sofar.add(name)
        safe_print(f' -> NOT FOUND')
    results_updated = True
    
    if results_updated:
        with open('probe_rss_result.json', 'w', encoding='utf-8') as f:
            json.dump({
                'found': list(found_sofar.items()),
                'not_found': list(notfound_sofar)
            }, f, ensure_ascii=False, indent=2)
        results_updated = False
    
    time.sleep(0.5)

safe_print('\n=== ALL DONE ===')
safe_print(f'FOUND: {len(found_sofar)}')
safe_print(f'NOT FOUND: {len(notfound_sofar)}')
