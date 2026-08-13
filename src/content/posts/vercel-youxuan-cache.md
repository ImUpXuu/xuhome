---
title: "什么？你的vercel还没深绿？一文研究透vercel优选|缓存配置"
published: 2026-08-13 11:00:00
description: "从地区优选、IP优选到边缘缓存配置与缓存预热，让你的 Vercel 站点在国内测速全绿、加载飞快"
tags: ["Vercel", "CDN", "缓存", "优化"]
category: "技术"
---

很多玩 Vercel 的朋友都有一个执念：**让站点在国内测速工具上"深绿"**。

所谓"深绿"，就是拿 ITDog、boce、17ce 这类多点测速工具一测，全国几十个节点**全部绿色**——低延迟、全连通、不超时。而不是红一片、黄一片，看得人心慌。

今天就把我折腾 Vercel 的几招都掏出来：**地区优选 → IP 优选 → 缓存配置 → 缓存预热**。这几步做完，你的 Vercel 站点大概率就能从"黄绿相间"变"深绿"。

---

## 一、地区优选：藏在犄角旮旯的 Functions Region

很多人以为 Vercel 是全球 CDN，没"地区"一说。其实**函数运行的地区是能选的，而且默认在美国**。

这件事我在[《你的vercel项目，还能更快》](https://upxuu.com/posts/vercel666)里踩过坑，这里复述一遍重点：

1. 进入已部署的项目 → `Settings` → `Functions` → `Functions Region`
2. 默认勾的是 `Washington, D.C., USA (iad1)`，也就是**美国东部**
3. 把函数地区改到离你访客更近的地方（比如香港 `hkg1`、新加坡 `sin1`）

> ⚠️ 有个大坑：切换前**先切到 North America 把 USA 的勾取消掉**，否则会同时选中两个地区，而 **Hobby（免费）计划不支持多地区**，直接报错。

这个对**纯静态站点（SSG）提升有限**（因为没有函数请求），但对用了 Serverless Functions、或者像我这样跑着相册/小工具的场景，改完函数地区后响应能明显快一截。

---

## 二、IP 优选：让 DNS 解析到"最快的那个 Vercel"

地区优选解决的是"函数在哪跑"，但**网络层**的延迟才是国内访问 Vercel 的头号痛点。

### 2.1 为什么默认会慢

Vercel 的默认域名是 `cname.vercel-dns.com`。DNS 解析时，它会按"地理就近"给你返回一个边缘节点 IP。但**国内运营商线路复杂**，这个"就近"经常把你送到一个绕路、丢包、甚至被墙的节点上。

结果就是：测速一片红，或者 TTFB 飙到几百毫秒。

### 2.2 优选是什么

"优选"就是**跳过默认解析，手动把域名指向一个实测速度最快的 Vercel 边缘 IP**。

不过先记住一个省心的选择——**Vercel 官方自己就维护了一条中国优化的 CNAME**：

```text
你的域名  CNAME  cname-china.vercel-dns.com
```

这是官方维护的优选线路，把域名 CNAME 过去，Vercel 会自动走中国优化节点，**最省心也最稳定**，是我推荐的"官方优选"首选。

如果官方线路还不够快，再上下面两种进阶玩法：

**方案 A：CNAME 到第三方优选域名**

```text
你的域名  CNAME  vercel.cdn.xxx.com
```

社区里有人维护"优选 CNAME"域名，背后做了智能调度，能帮你解析到更快的节点。缺点是**依赖第三方**，稳定性要自己验证。

**方案 B：A 记录到优选 IP**（更可控）

1. 用测速工具批量测 Vercel 的 IP 段
2. 挑出你所在地区延迟最低、最稳的几个 IP
3. 域名直接 A 记录指过去

> ⚠️ 优选 IP **时效性很强**——今天快，过几天运营商路由一调可能就变慢。所以最好是配合一个定期测速脚本，或者干脆用 CNAME 方案让别人帮你维护。

### 2.3 测速选 IP 的工具

- **ITDog** 的 Vercel 优选测速（能直接看全国节点到各 IP 的延迟）
- **boce.com**（站长工具，多点 ping/HTTP 测速）
- **17ce.com**（经典的多点测速）

选 IP 的标准就一条：**延迟低、丢包少、全国分布均匀**。测到全绿的那个 IP，就是你的"深绿密码"。

---

## 三、缓存配置：vercel.json 里的小巧思

网络快了，还得让**内容本身就快**。这里有个很多人没发现的坑：**Vercel 默认情况下，你的主 HTML 根本命中不了缓存。**

### 3.1 默认缓存的坑

Vercel 对 HTML 默认返回：

```http
Cache-Control: public, max-age=0, must-revalidate
```

翻译一下就是：CDN 把你的 HTML 存下来了，但**标记为"立即过期"**，每次访问都得**回源问一句"变没变"**。

存了等于没存——每次都多一次回源往返，`X-Vercel-Cache` 永远是 `MISS`。

### 3.2 两个关键字段分清

| 字段 | 谁在缓存 | 该设多少 |
|------|---------|---------|
| `max-age` | 浏览器 | HTML 设 `0`，更新能及时生效 |
| `s-maxage` | CDN（边缘） | 设长一点，让边缘直接命中 |

浏览器缓存（`max-age`）**不跟部署走**，设长了用户看不到更新；边缘缓存（`s-maxage`）**跟部署走**，你重新部署它就自动失效刷新。所以正确姿势是：**浏览器不缓存，边缘往死里缓存**。

### 3.3 我的 vercel.json 配置

```json
{
  "headers": [
    {
      "source": "/_astro/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=315360000, immutable" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, s-maxage=315360000, must-revalidate" }
      ]
    }
  ]
}
```

两条规则，两个小巧思：

1. **`/_astro/` 带 hash 的资源**：`max-age=315360000, immutable` —— 十年不可变。Astro 构建出来的 JS/CSS 文件名自带内容 hash，内容一变文件名就变，所以放心缓存十年。
2. **其余（HTML 等）**：`max-age=0, s-maxage=315360000` —— 浏览器不缓存（保证更新及时），但边缘缓存十年（反正重新部署就刷新）。

配完之后 curl 一下，你会看到梦寐以求的：

```http
X-Vercel-Cache: HIT
```

从 `MISS` 到 `HIT`，加载速度立竿见影。

---

## 四、缓存预热：别让第一个访客替你"暖场"

配了边缘缓存后有个小尴尬：**新部署的缓存是空的**。第一个访问某个页面的人，会命中 `MISS`、回源一次，然后 CDN 才把页面缓存下来。

也就是说，**每次部署后，第一个访客永远是"最慢的"**。对流量小的个人站，可能几十个页面要等几十个人慢慢"暖场"才全绿。

于是我写了个 **GitHub Actions 工作流**，部署完自动把全站页面"刷一遍"，主动预热缓存：

### 4.1 工作流逻辑

```text
push 到 main
  ↓ 等 120 秒（Vercel 构建 + 缓冲）
  ↓ 提取 sitemap.xml 所有页面 URL
  ↓ 第一遍 curl：预热边缘缓存（让 CDN 缓存所有页面）
  ↓ 第二遍 curl：逐个读 X-Vercel-Cache，统计 HIT/MISS
  ↓ 把命中报告写入 HIT.txt 并提交回仓库
```

### 4.2 命中报告

每次跑完，仓库根目录会生成一份 [HIT.txt](https://github.com/ImUpXuu/xuhome/blob/main/HIT.txt)，开头是统计（命中数 / 未命中数 / 命中率），下面是每个 URL 的详细状态。

工作流源码在这里：[cache-hit-check.yml](https://github.com/ImUpXuu/xuhome/blob/main/.github/workflows/cache-hit-check.yml)

> 有个细节：curl 本身**没有客户端缓存**，所以天然"忽略客户端缓存"，不需要加 `Cache-Control: no-cache` 头——加了反而会强制 CDN 重新验证，全测成 MISS。

---

## 五、总结

把这几招串起来，就是一条完整的"深绿"链路：

1. **地区优选**：把 Functions Region 从美国改到香港/新加坡
2. **IP 优选**：CNAME 优选域名 或 A 记录到测速最快的 IP
3. **缓存配置**：HTML `max-age=0` + 边缘 `s-maxage` 拉满，hash 资源 immutable
4. **缓存预热**：工作流自动刷全站，第一个访客也不用暖场

做完这四步，你的 Vercel 站点大概率就能在测速工具上看到一片赏心悦目的深绿了。

当然，优选 IP 会随运营商路由动态变化，建议隔段时间复测一次；缓存和预热则是"一次配置，长期受益"。祝你的站点早日深绿 🟢
