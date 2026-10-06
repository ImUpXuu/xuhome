#!/usr/bin/env python3
"""UpXuu Blog Analytics API —— 极简版
标准库 http.server + psycopg2（唯一依赖），内存占用极小。
读 umami Postgres，暴露公开统计接口。
"""
import hashlib
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import psycopg2
import psycopg2.extras

# 数据库连接串（敏感信息从环境变量注入，禁止硬编码密码进仓库）
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise RuntimeError("缺少 DATABASE_URL 环境变量")
PORT = int(os.environ.get("PORT", "3666"))
CACHE_TTL = int(os.environ.get("CACHE_TTL", "60"))
WEBSITE_ID = os.environ.get("WEBSITE_ID", "")

_cache = {}
_lock = threading.Lock()

def get_conn():
    return psycopg2.connect(DB_URL, connect_timeout=5)

def website_id(conn):
    if WEBSITE_ID:
        return WEBSITE_ID
    with conn.cursor() as cur:
        cur.execute(
            "SELECT website_id FROM website WHERE deleted_at IS NULL AND (domain=%s OR domain LIKE %s) ORDER BY created_at ASC LIMIT 1",
            ("upxuu.com", "%upxuu.com"),
        )
        row = cur.fetchone()
    if not row:
        raise RuntimeError("website not found")
    return row[0]

def cached(key, fn):
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
    val = fn()
    with _lock:
        _cache[key] = (time.time() + CACHE_TTL, val)
    return val

def json_resp(handler, code, obj):
    body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "*")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)

def query(sql, params=None):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()

class Handler(BaseHTTPRequestHandler):
    server_version = "BlogAPI/1.0"

    def log_message(self, fmt, *args):
        pass

    def do_OPTIONS(self):
        json_resp(self, 204, {})

    def do_GET(self):
        try:
            self._route()
        except Exception as e:
            try:
                json_resp(self, 500, {"error": str(e)})
            except Exception:
                pass

    def _route(self):
        url = urlparse(self.path)
        path = url.path
        qs = parse_qs(url.query)

        if path == "/health":
            json_resp(self, 200, {"ok": True, "db": "postgres/umami"})
            return
        if path == "/":
            json_resp(self, 200, {
                "service": "upxuu blog analytics api",
                "endpoints": [
                    "/api/stats",
                    "/api/pages?hours=24&limit=50",
                    "/api/page?path=%2Fposts%2Fxxx%2F&hours=168",
                    "/api/realtime?hours=24",
                    "/health",
                ],
            })
            return
        if path == "/api/stats":
            self.api_stats(qs)
            return
        if path == "/api/pages":
            self.api_pages(qs)
            return
        if path == "/api/page":
            self.api_page(qs)
            return
        if path == "/api/views":
            # 极简：直接返回单页 PV 数字（供前端阅读量显示）
            self.api_views(qs)
            return
        if path == "/api/views-batch":
            # 批量：一次请求返回多页 PV（首页列表用，避免每卡一请求）
            self.api_views_batch(qs)
            return
        if path == "/api/realtime":
            self.api_realtime(qs)
            return
        if path == "/api/trend":
            # 24h 逐小时趋势：pv / uv(去重访客) / visits(session 数)
            self.api_trend(qs)
            return
        json_resp(self, 404, {"error": "not found"})

    def api_stats(self, qs):
        hours = self._parse_hours(qs, 0)
        def fn():
            conn = get_conn()
            wid = website_id(conn)
            conn.close()
            if hours > 0:
                pv = query(
                    "SELECT count(*)::int AS pv FROM website_event WHERE website_id=%s AND event_type=1 AND created_at >= now() - (%s || ' hours')::interval",
                    (wid, hours),
                )[0]["pv"]
                sessions = query(
                    "SELECT count(*)::int AS s FROM session WHERE website_id=%s AND created_at >= now() - (%s || ' hours')::interval",
                    (wid, hours),
                )[0]["s"]
            else:
                pv = query(
                    "SELECT count(*)::int AS pv FROM website_event WHERE website_id=%s AND event_type=1",
                    (wid,),
                )[0]["pv"]
                sessions = query(
                    "SELECT count(*)::int AS s FROM session WHERE website_id=%s",
                    (wid,),
                )[0]["s"]
            today = query(
                "SELECT count(*)::int AS t FROM website_event WHERE website_id=%s AND event_type=1 AND created_at >= date_trunc('day', now())",
                (wid,),
            )[0]["t"]
            return {"pv": pv, "sessions": sessions, "todayPv": today, "hours": hours or None}
        json_resp(self, 200, cached(f"stats:{hours}", fn))

    def _parse_hours(self, qs, default):
        """hours 解析：0 表示「全部时段」（不过滤时间），缺失/非法才用 default。"""
        raw = (qs.get("hours", [None])[0] or "").strip()
        if raw == "":
            return default
        try:
            return int(raw)
        except ValueError:
            return default

    def api_pages(self, qs):
        hours = self._parse_hours(qs, 24)
        limit = min(int((qs.get("limit", ["50"])[0] or "50")), 200)
        def fn():
            if hours > 0:
                rows = query(
                    """SELECT url_path AS path, coalesce(MAX(page_title), '') AS title, count(*)::int AS views
                       FROM website_event
                      WHERE website_id=%s AND event_type=1 AND created_at >= now() - (%s || ' hours')::interval
                      GROUP BY url_path ORDER BY views DESC LIMIT %s""",
                    (website_id(get_conn()), hours, limit),
                )
            else:
                rows = query(
                    """SELECT url_path AS path, coalesce(MAX(page_title), '') AS title, count(*)::int AS views
                       FROM website_event
                      WHERE website_id=%s AND event_type=1
                      GROUP BY url_path ORDER BY views DESC LIMIT %s""",
                    (website_id(get_conn()), limit),
                )
            return {"hours": hours, "total": len(rows), "pages": rows}
        json_resp(self, 200, cached(f"pages:{hours}:{limit}", fn))

    def api_page(self, qs):
        path = qs.get("path", ["/"])[0] or "/"
        hours = self._parse_hours(qs, 168)
        def fn():
            wid = website_id(get_conn())
            total = query(
                "SELECT count(*)::int AS v FROM website_event WHERE website_id=%s AND event_type=1 AND url_path=%s AND created_at >= now() - (%s || ' hours')::interval",
                (wid, path, hours),
            )[0]["v"]
            series = query(
                """SELECT date_trunc('hour', created_at) AS t, count(*)::int AS views
                   FROM website_event
                  WHERE website_id=%s AND event_type=1 AND url_path=%s AND created_at >= now() - (%s || ' hours')::interval
                  GROUP BY 1 ORDER BY 1""",
                (wid, path, hours),
            )
            return {
                "path": path,
                "hours": hours,
                "totalViews": total,
                "series": [{"t": str(r["t"]), "views": r["views"]} for r in series],
            }
        json_resp(self, 200, cached(f"page:{path}:{hours}", fn))

    def api_views(self, qs):
        path = qs.get("path", ["/"])[0] or "/"
        def fn():
            wid = website_id(get_conn())
            total = query(
                "SELECT count(*)::int AS v FROM website_event WHERE website_id=%s AND event_type=1 AND url_path=%s",
                (wid, path),
            )[0]["v"]
            return {"path": path, "views": total}
        json_resp(self, 200, cached(f"views:{path}", fn))

    def api_views_batch(self, qs):
        raw = (qs.get("paths", [""])[0] or "").strip()
        paths = [p for p in raw.split(",") if p][:100]
        if not paths:
            json_resp(self, 200, {"views": {}})
            return
        def fn():
            wid = website_id(get_conn())
            rows = query(
                """SELECT url_path, count(*)::int AS v
                   FROM website_event
                  WHERE website_id=%s AND event_type=1 AND url_path = ANY(%s)
                  GROUP BY url_path""",
                (wid, paths),
            )
            m = {r["url_path"]: r["v"] for r in rows}
            return {"views": {p: m.get(p, 0) for p in paths}}
        key = "viewsbatch:" + hashlib.md5(raw.encode()).hexdigest()
        json_resp(self, 200, cached(key, fn))

    def api_realtime(self, qs):
        hours = self._parse_hours(qs, 24)
        def fn():
            rows = query(
                """SELECT date_trunc('hour', created_at) AS t, count(*)::int AS views
                   FROM website_event
                  WHERE website_id=%s AND event_type=1 AND created_at >= now() - (%s || ' hours')::interval
                  GROUP BY 1 ORDER BY 1""",
                (website_id(get_conn()), hours),
            )
            return {"hours": hours, "series": [{"t": str(r["t"]), "views": r["views"]} for r in rows]}
        json_resp(self, 200, cached(f"realtime:{hours}", fn))

    def api_trend(self, qs):
        """逐小时 pv / uv / visits。uv 按 session 表 distinct_id 去重。"""
        hours = self._parse_hours(qs, 24)
        def fn():
            wid = website_id(get_conn())
            # 每小时 PV（页面事件）
            pv_rows = query(
                """SELECT date_trunc('hour', created_at) AS t, count(*)::int AS pv
                   FROM website_event
                  WHERE website_id=%s AND event_type=1 AND created_at >= now() - (%s || ' hours')::interval
                  GROUP BY 1 ORDER BY 1""",
                (wid, hours),
            )
            # 每小时 UV（独立访客 ≈ 会话数，session_id 去重；distinct_id 未填充）
            uv_rows = query(
                """SELECT date_trunc('hour', created_at) AS t, count(DISTINCT session_id)::int AS uv
                   FROM session
                  WHERE website_id=%s AND created_at >= now() - (%s || ' hours')::interval
                  GROUP BY 1 ORDER BY 1""",
                (wid, hours),
            )
            # 每小时 Visits（session 数）
            vs_rows = query(
                """SELECT date_trunc('hour', created_at) AS t, count(*)::int AS visits
                   FROM session
                  WHERE website_id=%s AND created_at >= now() - (%s || ' hours')::interval
                  GROUP BY 1 ORDER BY 1""",
                (wid, hours),
            )
            pv_map = {str(r["t"]): r["pv"] for r in pv_rows}
            uv_map = {str(r["t"]): r["uv"] for r in uv_rows}
            vs_map = {str(r["t"]): r["visits"] for r in vs_rows}
            # 并集所有小时点
            all_t = sorted(set(pv_map) | set(uv_map) | set(vs_map))
            series = [
                {
                    "t": t,
                    "pv": pv_map.get(t, 0),
                    "uv": uv_map.get(t, 0),
                    "visits": vs_map.get(t, 0),
                }
                for t in all_t
            ]
            return {
                "hours": hours,
                "series": series,
                "total": {
                    "pv": sum(pv_map.values()),
                    "uv": sum(uv_map.values()),
                    "visits": sum(vs_map.values()),
                },
            }
        json_resp(self, 200, cached(f"trend:{hours}", fn))

def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"blog-api listening on :{PORT}", flush=True)
    server.serve_forever()

if __name__ == "__main__":
    main()