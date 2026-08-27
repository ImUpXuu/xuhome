# Blog Analytics API 文档

基于 Umami 数据库（PostgreSQL）的博客访问统计公开 API。
**Base URL**：`https://blog.api.upxuu.com`

> 所有接口均为 `GET` 方法、无需鉴权、支持 CORS（`Access-Control-Allow-Origin: *`）。
> 响应均为 JSON，带内存缓存（默认 60 秒 TTL），适合前端直接轮询调用。

---

## 接口总览

| 端点 | 说明 |
|---|---|
| `GET /health` | 服务健康检查 |
| `GET /api/stats?hours=` | 总览统计（PV/UV/Visits/今日PV） |
| `GET /api/pages?hours=&limit=` | 页面访问排行 |
| `GET /api/page?path=&hours=` | 单页详情（总量+逐小时序列） |
| `GET /api/views?path=` | 单页阅读数（极简，只返回数字） |
| `GET /api/realtime?hours=` | 整站逐小时 PV 趋势 |
| `GET /api/trend?hours=` | 逐小时 PV/UV/Visits 多指标趋势 |

---

## GET /health

服务健康检查。

```bash
curl https://blog.api.upxuu.com/health
```

```json
{ "ok": true, "db": "postgres/umami" }
```

---

## GET /api/stats

站点总览统计。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `hours` | int | `0`（不限） | 统计最近 N 小时；`0` = 全部历史 |

**示例**

```bash
curl "https://blog.api.upxuu.com/api/stats"
curl "https://blog.api.upxuu.com/api/stats?hours=24"
```

**响应**

```json
{
  "pv": 52764,
  "sessions": 12201,
  "todayPv": 111,
  "hours": null
}
```

| 字段 | 说明 |
|---|---|
| `pv` | 页面浏览总量（event_type=1） |
| `sessions` | 访问会话数（session 表去重） |
| `todayPv` | 今日 PV（从当天 0 点起） |
| `hours` | 实际统计的时间窗口，全量时为 `null` |

---

## GET /api/pages

各页面访问量排行（按 PV 降序）。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `hours` | int | `24` | 统计窗口（小时）；`0` = 全部历史 |
| `limit` | int | `50` | 返回条数上限（最大 200） |

**示例**

```bash
curl "https://blog.api.upxuu.com/api/pages?hours=24&limit=5"
```

**响应**

```json
{
  "hours": 24,
  "total": 5,
  "pages": [
    {
      "path": "/posts/bloglog260826/",
      "title": "开学了，博客又要何去何从 - UpXuu's blog",
      "views": 133
    },
    { "path": "/", "title": "...", "views": 127 }
  ]
}
```

---

## GET /api/page

单页详情：总 PV + 逐小时时间序列。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `path` | string | `/` | 页面路径（需 URL 编码，如 `%2Fposts%2Ffree-kimi%2F`） |
| `hours` | int | `168` | 统计窗口（小时） |

**示例**

```bash
curl "https://blog.api.upxuu.com/api/page?path=%2Fposts%2Ffree-kimi%2F&hours=168"
```

**响应**

```json
{
  "path": "/posts/free-kimi/",
  "hours": 168,
  "totalViews": 240,
  "series": [
    { "t": "2026-08-21 00:00:00+00:00", "views": 4 },
    { "t": "2026-08-21 01:00:00+00:00", "views": 19 }
  ]
}
```

> `t` 为 UTC 时间字符串。注意本接口返回完整逐小时序列（含空档跳过），仅作图表分析用；前端展示阅读数请用 [`/api/views`](#get-api-views)。

---

## GET /api/views

单页累计阅读数（极简版）。前端「xx 次阅读」显示用这个。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `path` | string | `/` | 页面路径（URL 编码） |

**示例**

```bash
curl "https://blog.api.upxuu.com/api/views?path=%2Fposts%2Ffree-kimi%2F"
```

**响应**

```json
{ "path": "/posts/free-kimi/", "views": 240 }
```

**前端调用示例**

```js
const res = await fetch(
  'https://blog.api.upxuu.com/api/views?path=' + encodeURIComponent('/posts/free-kimi/')
);
const data = await res.json();
console.log(data.views); // 240
```

---

## GET /api/realtime

整站逐小时 PV 趋势。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `hours` | int | `24` | 统计窗口（小时） |

**响应**

```json
{
  "hours": 24,
  "series": [
    { "t": "2026-08-26 20:00:00+00:00", "views": 3 },
    { "t": "2026-08-26 21:00:00+00:00", "views": 4 }
  ]
}
```

---

## GET /api/trend

逐小时多指标趋势：PV / UV / Visits（统计页趋势图使用）。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `hours` | int | `24` | 统计窗口（小时） |

**示例**

```bash
curl "https://blog.api.upxuu.com/api/trend?hours=24"
```

**响应**

```json
{
  "hours": 24,
  "total": { "pv": 712, "uv": 261, "visits": 261 },
  "series": [
    { "t": "2026-08-26 02:00:00+00:00", "pv": 9, "uv": 5, "visits": 5 }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `series[].pv` | 该小时页面浏览量 |
| `series[].uv` | 该小时独立访客数（按 session_id 去重） |
| `series[].visits` | 该小时会话次数 |
| `total` | 窗口内合计 |

> `series` 只包含有数据的小时点，多个小时的点可能不连续，绘图时 X 轴按数组下标均分即可。

---

## 错误响应

```json
{ "error": "描述信息" }
```

| 状态码 | 场景 |
|---|---|
| 400 | 参数非法（如 id 非数字） |
| 404 | 评论/资源不存在（cmt-status） |
| 500 | 服务内部错误 |
| 503 | 数据库忙 |

---

## 内部接口（非公开）

以下接口供管理后台使用，不在公开文档范围：

- `POST /api/login`、`POST /api/logout` — 管理员登录
- `GET /api/me` — 登录状态
- `GET /api/reviews` — 审核记录列表（游客视图打码）
- `GET /api/review/{id}` — 单评论审核详情
- `GET /api/pages`（同公开）/ `GET /api/comment/{id}/{action}` — 手动通过/拦截
- `GET /api/cmt-status?id=` — 评论审核状态查询（评论提交后前端轮询）

面板地址：`/ljxadmin`（需密码登录）或只读公开视图 `/`。

---

## 技术说明

- **运行时**：Python 3.12 标准库 `http.server` + psycopg2，systemd 守护（`blog-api.service`）
- **数据库**：Umami 所在 PostgreSQL 的 `website` / `website_event` / `session` 表（只读）
- **缓存**：进程内内存缓存 60 秒，相同请求命中缓存直接返回
- **部署目录**：服务器 `/opt/blog-api`
- **源码位置**：仓库根目录 `blog-api/` 子目录