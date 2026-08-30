#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rpm_loadtest.py — 基于 RPM（每分钟请求数）的轻量级 HTTP(S) 压测工具。

特点：
  * 零外部依赖，仅使用 Python 标准库（threading + http.client）
  * 通过精确调度控制全局 RPM，适合温和的性能 / 压力测试
  * 实时输出每一个请求（序号 / 时间戳 / 状态码 / 耗时 / 错误）
  * 专业分段统计：按时间窗口输出吞吐、成功率、延迟分位数、状态码分布
  * 全程写 log 文件：配置、每个请求、每段统计、最终报告全部落盘
  * 支持自定义方法、请求头、超时、并发数、TLS 校验开关
  * 可选导出 JSON 详细报告

示例：
  python rpm_loadtest.py
      # 无参数直接跑：https://upxuu.com, 1000 RPM, 36000s
  python rpm_loadtest.py --rpm 200 --duration 60 --segment 10 \\
      --log my_test.log --output report.json

注意：请仅对自有或已获明确授权的目标进行测试。
"""

import argparse
import datetime
import http.client
import json
import os
import ssl
import statistics
import sys
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse


def _safe_cwd_path(p, label):
    """把输出/日志路径限制在当前工作目录内，防止写入任意位置（路径穿越）。"""
    base = os.path.abspath(os.getcwd())
    path = os.path.abspath(p)
    if not path.startswith(base + os.sep):
        raise ValueError(f"{label} 必须位于当前工作目录内，拒绝写入: {p}")
    return path






def percentile(data, p):
    """线性插值法计算百分位。"""
    if not data:
        return 0.0
    data = sorted(data)
    k = (len(data) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(data) - 1)
    if f == c:
        return data[f]
    return data[f] + (data[c] - data[f]) * (k - f)


def fmt_ms(ms):
    return f"{ms:.1f}" if ms < 10000 else f"{ms:.0f}"


def fmt_bytes(n):
    n = float(n)
    if n < 1024:
        return f"{n:.0f}B"
    if n < 1024 ** 2:
        return f"{n / 1024:.1f}KB"
    if n < 1024 ** 3:
        return f"{n / 1024 ** 2:.2f}MB"
    return f"{n / 1024 ** 3:.2f}GB"


def now_str():
    return datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]


def now_fname():
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")


def summarize(records):
    """对一组请求记录计算统计摘要，供分段 / 最终报告复用。"""
    total = len(records)
    latencies = [r["elapsed"] * 1000.0 for r in records]
    success = sum(1 for r in records
                  if r["status"] is not None and 200 <= r["status"] < 400)
    status_codes = Counter(r["status"] for r in records if r["status"] is not None)
    errors = Counter(r["error"].split(":", 1)[0]
                     for r in records if r["error"])
    s = {
        "total": total,
        "success": success,
        "failed": total - success,
        "bytes": sum(r.get("bytes", 0) for r in records),
        "codes": status_codes,
        "errors": errors,
    }
    if latencies:
        s.update({
            "avg": statistics.mean(latencies),
            "min": min(latencies),
            "max": max(latencies),
            "p50": percentile(latencies, 50),
            "p95": percentile(latencies, 95),
            "p99": percentile(latencies, 99),
        })
    else:
        s.update({"avg": 0.0, "min": 0.0, "max": 0.0,
                  "p50": 0.0, "p95": 0.0, "p99": 0.0})
    return s


def codes_str(codes):
    if not codes:
        return "-"
    return " ".join(f"{c}:{n}" for c, n in sorted(codes.items()))






class TeeLogger:
    def __init__(self, logfile):
        self.f = open(logfile, "a", encoding="utf-8", buffering=1)
        self.lock = threading.Lock()

    def log(self, msg, console=True):
        with self.lock:
            if console:
                print(msg, flush=True)
            self.f.write(msg + "\n")

    def close(self):
        self.f.close()






class RequestWorker:
    """对单个 URL 发起一次请求，线程安全可复用。"""

    def __init__(self, parsed, path, method, headers, timeout, insecure):
        self.parsed = parsed
        self.path = path
        self.method = method
        self.headers = headers
        self.timeout = timeout
        self.insecure = insecure
        
        self.ssl_ctx = None
        if parsed.scheme == "https":
            self.ssl_ctx = ssl.create_default_context()
            if insecure:
                self.ssl_ctx.check_hostname = False
                self.ssl_ctx.verify_mode = ssl.CERT_NONE

    def __call__(self, idx):
        is_https = self.parsed.scheme == "https"
        port = self.parsed.port or (443 if is_https else 80)

        start = time.perf_counter()
        conn = None
        try:
            if is_https:
                conn = http.client.HTTPSConnection(
                    self.parsed.hostname, port, timeout=self.timeout,
                    context=self.ssl_ctx)
            else:
                conn = http.client.HTTPConnection(
                    self.parsed.hostname, port, timeout=self.timeout)
            conn.request(self.method, self.path, headers=self.headers)
            resp = conn.getresponse()
            body = resp.read()  
            elapsed = time.perf_counter() - start
            nbytes = len(f"HTTP/1.1 {resp.status} {resp.reason}\r\n".encode())
            nbytes += sum(len(k.encode()) + len(v.encode()) + 4
                          for k, v in resp.getheaders())
            nbytes += len(body)
            return {"idx": idx, "status": resp.status,
                    "reason": resp.reason, "elapsed": elapsed,
                    "bytes": nbytes, "error": None}
        except Exception as e:
            elapsed = time.perf_counter() - start
            return {"idx": idx, "status": None, "reason": "",
                    "elapsed": elapsed, "bytes": 0,
                    "error": f"{type(e).__name__}: {e}"}
        finally:
            try:
                if conn:
                    conn.close()
            except Exception:
                pass






class LoadTest:
    def __init__(self, parsed, path, rpm, duration, method, headers,
                 timeout, concurrency, insecure, segment, logger,
                 hard_stop=False, quiet=False):
        self.parsed = parsed
        self.path = path
        self.rpm = rpm
        self.duration = duration
        self.method = method
        self.headers = headers
        self.timeout = timeout
        self.concurrency = concurrency
        self.insecure = insecure
        self.segment = segment
        self.log = logger
        self.hard_stop = hard_stop
        self.quiet = quiet

        self.results = []
        self.lock = threading.Lock()
        self.sent = 0
        self.stop_event = threading.Event()
        self.peak_bw = 0.0

    def on_done(self, fut):
        try:
            res = fut.result()
        except Exception as e:
            res = {"idx": -1, "status": None, "reason": "",
                   "elapsed": 0.0, "bytes": 0,
                   "error": f"{type(e).__name__}: {e}"}
        rel = time.perf_counter() - self.start_time
        res["done_rel"] = rel
        with self.lock:
            self.results.append(res)

        ms = res["elapsed"] * 1000.0
        if res["status"] is not None:
            line = (f"#{res['idx']:04d} {now_str()}  "
                    f"{res['status']} {res['reason']:<8} "
                    f"{fmt_ms(ms):>8} ms  {fmt_bytes(res.get('bytes', 0)):>10}")
        else:
            line = (f"#{res['idx']:04d} {now_str()}  "
                    f"{'ERROR':<14} "
                    f"{fmt_ms(ms):>8} ms  "
                    f"{fmt_bytes(res.get('bytes', 0)):>10}  {res['error']}")
        self.log.log(line, console=not self.quiet)

    def monitor(self):
        seg_idx = 0
        consumed = 0
        win_start = 0.0
        while not self.stop_event.wait(self.segment):
            with self.lock:
                snapshot = list(self.results)
            now_rel = time.perf_counter() - self.start_time
            window = [r for r in snapshot[consumed:] if r["done_rel"] <= now_rel]
            consumed += len(window)
            cur = summarize(window)

            span = max(now_rel - win_start, 1e-9)
            rps = cur["total"] / span
            bw = cur["bytes"] / span
            self.peak_bw = max(self.peak_bw, bw)
            line = (f"[分段 {seg_idx + 1:02d}] {win_start:6.1f}s ~ {now_rel:6.1f}s | "
                    f"完成 {cur['total']:4d} | 成功 {cur['success']:4d} | "
                    f"失败 {cur['failed']:3d} | {rps:6.2f} req/s | "
                    f"流量 {fmt_bytes(cur['bytes']):>9} @ {fmt_bytes(bw)}/s | "
                    f"延迟 avg {fmt_ms(cur['avg'])} / P50 {fmt_ms(cur['p50'])} / "
                    f"P95 {fmt_ms(cur['p95'])} / P99 {fmt_ms(cur['p99'])} ms | "
                    f"{codes_str(cur['codes'])}")
            self.log.log(line)
            if cur["errors"]:
                self.log.log("         错误: " +
                             " ".join(f"{k}:{v}" for k, v in
                                      cur["errors"].most_common()))
            seg_idx += 1
            win_start = now_rel

    def run(self):
        interval = 60.0 / self.rpm
        worker = RequestWorker(self.parsed, self.path, self.method,
                               self.headers, self.timeout, self.insecure)
        planned = int(self.rpm * (self.duration / 60.0))

        self.log.log(f"目标: {self.parsed.geturl()}")
        self.log.log(f"配置: RPM={self.rpm}, 持续={self.duration}s, "
                     f"方法={self.method}, 并发={self.concurrency}, "
                     f"超时={self.timeout}s, 分段={self.segment}s")
        self.log.log(f"计划请求数: 约 {planned} 个 (发送间隔 {interval:.3f}s)")
        self.log.log("=" * 78)
        self.log.log(f"{'时间':<12}{'#':<6}{'状态':<16}{'耗时(ms)':>10}")
        self.log.log("-" * 78)

        pool = ThreadPoolExecutor(max_workers=self.concurrency)
        self.start_time = time.perf_counter()
        deadline = self.start_time + self.duration
        aborted = False

        mon = threading.Thread(target=self.monitor, daemon=True)
        mon.start()

        try:
            next_send = self.start_time
            while time.perf_counter() < deadline:
                now = time.perf_counter()
                if now < next_send:
                    time.sleep(next_send - now)
                    if time.perf_counter() >= deadline:
                        break
                fut = pool.submit(worker, self.sent)
                fut.add_done_callback(self.on_done)
                self.sent += 1
                next_send = self.start_time + self.sent * interval
        except KeyboardInterrupt:
            aborted = True
            self.log.log("\n[收到中断信号，正在等待已提交请求收尾... "
                         "再按一次 Ctrl+C 放弃等待]")
        finally:
            if self.hard_stop:
                self.log.log("\n[hard-stop] 到达时限，丢弃在途请求，立即出报告")
                try:
                    pool.shutdown(wait=False, cancel_futures=True)
                except TypeError:
                    pool.shutdown(wait=False)
            else:
                try:
                    pool.shutdown(wait=True)
                except KeyboardInterrupt:
                    aborted = True
                    self.log.log("\n[二次中断] 放弃等待在途请求，直接出报告")
                    try:
                        pool.shutdown(wait=False, cancel_futures=True)
                    except TypeError:
                        pool.shutdown(wait=False)
            wall_time = time.perf_counter() - self.start_time
            self.stop_event.set()
            mon.join(timeout=2)

        self.log.log("-" * 78)
        self.final_report(wall_time, aborted)
        return self.results, wall_time, self.sent

    def final_report(self, wall_time, aborted):
        with self.lock:
            results = list(self.results)
        s = summarize(results)
        rps = s["total"] / wall_time if wall_time > 0 else 0

        self.log.log("【最终压测结果】")
        if aborted:
            self.log.log("(用户提前终止)")
        self.log.log(f"墙钟时间       : {wall_time:.2f}s")
        self.log.log(f"已发送请求     : {self.sent}")
        self.log.log(f"已完成响应     : {s['total']}")
        self.log.log(f"实际吞吐       : {rps:.2f} req/s  ({rps * 60:.1f} rpm)")
        self.log.log(f"成功(2xx-3xx)  : {s['success']}    "
                     f"失败(4xx/5xx/错误): {s['failed']}")
        self.log.log("")
        bw_avg = s["bytes"] / wall_time if wall_time > 0 else 0
        self.log.log("【带宽统计 (下行) 】")
        self.log.log(f"  总接收流量   : {fmt_bytes(s['bytes'])} "
                     f"({s['bytes']:.0f} 字节, 含状态行+响应头+响应体)")
        self.log.log(f"  平均每请求   : {fmt_bytes(s['bytes'] / s['total']) if s['total'] else '0B'}")
        self.log.log(f"  平均带宽     : {fmt_bytes(bw_avg)}/s")
        self.log.log(f"  峰值分段带宽 : {fmt_bytes(self.peak_bw)}/s")
        self.log.log("")
        self.log.log("【响应时间 (ms)】")
        self.log.log(f"  平均 : {s['avg']:8.1f}    最小 : {s['min']:8.1f}    "
                     f"最大 : {s['max']:8.1f}")
        self.log.log(f"  P50  : {s['p50']:8.1f}    P95  : {s['p95']:8.1f}    "
                     f"P99  : {s['p99']:8.1f}")
        if s["codes"]:
            self.log.log("")
            self.log.log("【状态码分布】")
            for code in sorted(s["codes"]):
                self.log.log(f"  {code} : {s['codes'][code]}")
        if s["errors"]:
            self.log.log("")
            self.log.log("【错误类型分布】")
            for et, cnt in s["errors"].most_common():
                self.log.log(f"  {et} : {cnt}")






def parse_headers(header_list):
    headers = {}
    for h in header_list:
        if ":" in h:
            k, v = h.split(":", 1)
            headers[k.strip()] = v.strip()
    return headers


def main():
    parser = argparse.ArgumentParser(
        description="基于 RPM 的 HTTP(S) 压测工具（标准库实现，零依赖，"
                    "实时逐请求输出 + 分段统计 + 日志落盘）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="示例:\n  python rpm_loadtest.py   "
               "(无参数: upxuu.com / 1000 RPM / 36000s)",
    )
    parser.add_argument("url", nargs="?", default="https://upxuu.com",
                        help="目标 URL（默认 https://upxuu.com）")
    parser.add_argument("--rpm", type=int, default=1000,
                        help="每分钟请求数（默认 1000）")
    parser.add_argument("--duration", type=int, default=36000,
                        help="持续秒数（默认 36000 = 10 小时）")
    parser.add_argument("--method", default="GET",
                        help="HTTP 方法（默认 GET）")
    parser.add_argument("--timeout", type=float, default=10.0,
                        help="单请求超时秒（默认 10）")
    parser.add_argument("--concurrency", type=int, default=50,
                        help="并发线程数（默认 50）")
    parser.add_argument("--segment", type=float, default=5.0,
                        help="分段统计窗口秒（默认 5）")
    parser.add_argument("--hard-stop", action="store_true",
                        help="时限到达立即出报告，不等待在途请求完成")
    parser.add_argument("--quiet", action="store_true",
                        help="逐请求明细只写日志不刷控制台")
    parser.add_argument("--header", action="append", default=[],
                        metavar="Key:Value",
                        help="自定义请求头，可多次指定")
    parser.add_argument("--insecure", action="store_true",
                        help="跳过 TLS 证书校验")
    parser.add_argument("--log", metavar="FILE",
                        help="日志文件路径（默认 loadtest_时间戳.log）")
    parser.add_argument("--output", metavar="FILE",
                        help="将详细结果导出为 JSON 文件")
    args = parser.parse_args()

    parsed = urlparse(args.url)
    if parsed.scheme not in ("http", "https"):
        sys.exit("错误：URL 必须以 http:// 或 https:// 开头")
    if not parsed.hostname:
        sys.exit("错误：无法从 URL 解析主机名")
    if args.segment <= 0:
        sys.exit("错误：--segment 必须大于 0")

    path = parsed.path or "/"
    if parsed.query:
        path += "?" + parsed.query

    headers = parse_headers(args.header)
    headers.setdefault("Host", parsed.hostname)
    headers.setdefault("User-Agent", "rpm-loadtest/1.0")
    headers.setdefault("Accept", "*/*")

    logfile = args.log or f"loadtest_{now_fname()}.log"
    logfile = _safe_cwd_path(logfile, "日志文件")
    logger = TeeLogger(logfile)
    print(f"日志文件: {logfile}\n")

    lt = LoadTest(parsed, path, args.rpm, args.duration, args.method,
                  headers, args.timeout, args.concurrency, args.insecure,
                  args.segment, logger, hard_stop=args.hard_stop,
                  quiet=args.quiet)
    results, wall_time, sent = lt.run()

    if args.output:
        report = {
            "url": args.url,
            "config": {
                "rpm": args.rpm, "duration": args.duration,
                "method": args.method, "timeout": args.timeout,
                "concurrency": args.concurrency, "segment": args.segment,
            },
            "wall_time_s": round(wall_time, 3),
            "sent": sent,
            "completed": len(results),
            "results": [
                {"idx": r["idx"], "status": r["status"],
                 "elapsed_ms": round(r["elapsed"] * 1000, 2),
                 "bytes": r.get("bytes", 0),
                 "error": r["error"]}
                for r in results
            ],
        }
        with open(_safe_cwd_path(args.output, "输出文件"), "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n详细结果已写入: {args.output}")

    logger.close()


if __name__ == "__main__":
    main()
