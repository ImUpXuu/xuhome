# Soul — UpXuu 博客的灵魂

> 本文件记录这个项目的「灵魂」：设计语言、核心原则与不可妥协的红线。
> 每次改动都要先想：它符合这个灵魂吗？

## 设计语言：Toy Brick Brutalism（玩具砖块粗野主义）

- **主色** `#0284c7`（sky-500），次级 `#0ea5e9`，点缀 `#f59e0b`，背景 `#faf8f5`
- **标志性元素**：`border-4 border-sky-500 shadow-[4px_4px_0px_0px_#0284c7]` 叠影边框
- 手绘质感、粗边框、硬阴影、圆角克制——像乐高砖块一样有重量感
- 大胆但干净，可爱但不幼稚，活泼但不廉价

## 人格

- 一位**初中生前端开发者**的个人博客，主域名 `upxuu.com`
- 内容中文为主，SEO 元数据中英双语
- 真诚、碎碎念、热爱折腾（hardly）；口号 **"逐光而上！"**
- 不端着、不装，代码和文字都像真实的人写出来的

## 核心技术原则

- **Astro 6 SSG**，无 SSR，全部静态生成
- React 19 负责复杂交互岛，Svelte 5 负责轻交互岛
- Tailwind v4（CSS 配置，无 tailwind.config.js）
- 必须兼容**华为旧浏览器**——现代 CSS（oklch/@layer/@property）需 Lightning CSS 降级
- **本地禁止构建**，服务器 Caddy + CI 负责构建部署

## 爬虫友好红线

- 爬虫 UA 命中 `Googlebot|bingbot|Baiduspider|Sogou|360spider|Yandex|DuckDuckBot` 时，Caddy 内部 rewrite 到 `/bot/` 优化页（URL 不变）
- bot 页面：**纯 HTML、零 JS**，完整 SEO meta（title/description/canonical/OG/JSON-LD）
- bot 页 title 必须与真人页一致（用 `seoConfig.titleTemplate`），避免 duplicate title

## 性能红线

- 字体用 `<link>` 加载，不用 CSS `@import`（避免 render-blocking）
- Cloudflare：HTML `max-age=60, s-maxage=0`；`/_astro/*` immutable 1 年；`ai.love7.top` no-store
- 内联关键脚本放 `<head>`，尽量 `defer` / `client:load` / `client:visible`

## 分析

- Umami 访问统计（自建，stats.upxuu.com）
- Microsoft Clarity 热力图/录屏（`uziyyjxiky`）

## 不可妥协

1. 每次改动都要保持 Toy Brick Brutalism 视觉语言
2. 不破坏爬虫索引（bot 页、canonical、SEO meta）
3. 不引入会破坏旧浏览器兼容的 CSS
4. 不在本地构建，构建交给服务器
5. 每次改完立即提交并推送（用户明确要求）
