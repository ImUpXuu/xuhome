# UpXuu 的个人博客 / UpXuu's Personal Blog

> 基于 Astro 构建的极简粗野主义风格博客。Toy Brick Brutalism — 大胆的蓝色边框、手绘质感、积木堆叠美学。
> A brutalism-style personal blog built with Astro. Toy Brick Brutalism — bold blue borders, hand-drawn textures, brick-stacking aesthetics.

[![Astro](https://img.shields.io/badge/Astro-6.x-BC52EE?logo=astro)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte)](https://svelte.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)](https://vercel.com)

**在线地址 / Live Site:** [https://upxuu.com](https://upxuu.com)

---

## 📦 功能特性 / Features

### 🎨 设计与体验 / Design & UX

| 功能 | 说明 |
|------|------|
| **粗野主义风格** | 手绘质感、蓝色粗边框、阴影堆叠、积木美学 |
| **自定义光标**  | Svelte 实现的手绘风格光标，随点击弹出小星星 |
| **打字动画**    | PageBanner 和说说页面的逐字打字效果 |
| **页面过渡动画** | Astro View Transitions，页面切换顺滑流畅 |
| **骨架加载动画** | 积木掉落风格的骨架屏加载效果 |
| **响应式布局**  | 完美适配手机 / 平板 / 桌面端 |
| **文章目录**    | 桌面端侧边栏 + 移动端底部抽屉式目录，滚动高亮跟随 |
| **阅读进度条**  | 文章顶部蓝色渐变进度指示条 |
| **回到顶部按钮** | 右下角浮动按钮，滚动 300px 后显示 |
| **代码块增强**  | Mac 风格窗口控制、复制按钮、超长代码折叠展开 |

### 🧠 AI 集成 / AI Integration

| 功能 | 说明 |
|------|------|
| **AI 摘要**    | 每篇文章自动生成 AI 摘要，支持 GPT-OSS / DeepSeek R1 / Qwen 3.5 多模型切换 |
| **AI 对话**    | 文章页面右侧浮动聊天窗口，可针对当前文章内容提问，支持多轮对话和模型切换 |

### 🗣️ 社交功能 / Social

| 功能 | 说明 |
|------|------|
| **Waline 评论** | 自托管评论系统，支持 Markdown、表情、验证码、邮件通知 |
| **分享功能**    | 生成海报（横向分享图）、分享到 QQ 空间 / X (Twitter) / 微信、复制链接、系统原生分享 |
| **RSS 订阅**    | 4 条 RSS 2.0 Feed（全量 / 仅文章 / 仅说说 / 最新 10 篇） |
| **邮件订阅**    | 基于 GitHub Issues 的更新通知方案 |

### 🔍 内容管理 / Content Management

| 功能 | 说明 |
|------|------|
| **分类筛选**    | 按分类浏览文章 |
| **标签筛选**    | 按标签浏览文章 |
| **全文搜索**    | 客户端实时搜索，匹配标题、描述、内容、标签 |
| **分页浏览**    | 支持页码导航、跳转输入、前后翻页 |
| **日历归档**    | 按年月日查看历史文章 |
| **时间线归档**  | 时间线风格的归档页面 |
| **说说 (微博客)** | 独立微博客功能，支持照片、位置、天气、心情、设备信息 |

### 🤝 友链 / Friends

| 功能 | 说明 |
|------|------|
| **友链展示**    | 网格列表展示友情链接，含站点截图预览 |
| **自助申请**    | 基于 GitHub Issues + Actions 的友链自动化申请流程 |
| **搜索筛选**    | 实时搜索友链 |

### 🔧 技术特性 / Technical

| 功能 | 说明 |
|------|------|
| **SSG 静态生成** | 全站静态 HTML，CDN 加速，极速加载 |
| **SEO 优化**    | Open Graph / Twitter Card / JSON-LD 结构化数据 / Sitemap / robots.txt / Canonical URL |
| **图片灯箱**    | Fancybox 灯箱看图，支持缩放、全屏 |
| **数学公式**    | KaTeX 渲染，支持行内和块级公式 |
| **Markdown 增强** | GFM 表格、任务列表、删除线等 |
| **Umami 分析**  | 隐私友好的自托管访问统计 |
| **自定义 404**  | 粗野主义风格的 404 页面 |
| **中英文双语**  | 全站中文为主，SEO 标签含英文关键词 |

---

## 🚀 快速开始 / Quick Start

### 环境要求 / Prerequisites

- **Node.js** >= 22
- **pnpm**（推荐）或 npm / yarn

### 安装 / Installation

```bash
# 克隆项目
git clone https://github.com/ImUpXuu/xuhome.git
cd xuhome

# 安装依赖
pnpm install
```

### 开发 / Development

```bash
pnpm dev
```

访问 `http://localhost:3000`，支持热更新。

### 构建 / Build

```bash
pnpm build
```

构建产物在 `dist/` 目录。

### 预览 / Preview

```bash
pnpm preview
```

---

## 🗂️ 项目结构 / Project Structure

```
xuhome/
├── public/                 # 静态资源
│   ├── images/             # 头像等图片
│   └── robots.txt          # 搜索引擎爬虫配置
├── src/
│   ├── components/         # UI 组件
│   │   ├── AiChat.tsx          # AI 聊天 (React)
│   │   ├── AiSummary.tsx       # AI 文章摘要 (React)
│   │   ├── CalendarWidget.svelte  # 日历部件 (Svelte)
│   │   ├── CustomCursor.svelte # 自定义光标 (Svelte)
│   │   ├── HorizontalCategories.astro # 分类导航栏
│   │   ├── NavBar.astro        # 顶部导航栏
│   │   ├── PageBanner.tsx      # 页面标题横幅 (React)
│   │   ├── PostsTimelineWidget.astro # 文章时间线
│   │   ├── SearchablePosts.svelte # 可搜索文章列表 (Svelte)
│   │   ├── ShareButton.svelte  # 分享按钮 (Svelte)
│   │   ├── SidebarTags.astro   # 侧边栏标签云
│   │   ├── SvelteFriends.svelte # 友链展示 (Svelte)
│   │   ├── SvelteLightbox.svelte # 图片灯箱 (Svelte)
│   │   ├── SvelteTalkDetail.svelte # 说说详情 (Svelte)
│   │   ├── TagFilterWidget.tsx  # 标签过滤器 (React)
│   │   ├── TalksFeed.svelte    # 说说列表 (Svelte)
│   │   ├── TalkTicker.tsx      # 说说页打字动画 (React)
│   │   └── WalineComment.tsx   # Waline 评论 (React)
│   ├── config/             # 配置文件
│   │   ├── site.ts             # 站点基础配置
│   │   ├── seo.ts              # SEO 配置
│   │   ├── info.ts             # 站点信息配置
│   │   └── friends.ts          # 友链配置
│   ├── content/            # 内容集合 (Astro Content Collections)
│   │   ├── posts/              # 博客文章 (Markdown)
│   │   └── talks/              # 说说 (Markdown)
│   ├── content.config.ts   # 内容集合 Schema 定义
│   ├── index.css           # 全局样式 (Tailwind v4 + 自定义)
│   ├── layouts/
│   │   └── Layout.astro       # 全局布局 (SEO / 导航 / 页脚)
│   ├── pages/              # 页面路由
│   │   ├── index.astro        # 首页
│   │   ├── 404.astro          # 404 页面
│   │   ├── about.astro        # 关于页
│   │   ├── archive.astro      # 归档页
│   │   ├── friends.astro      # 友链页
│   │   ├── rss.xml.ts         # RSS Feed（全量：文章 + 说说）
│   │   ├── posts.xml.ts       # RSS Feed（仅文章）
│   │   ├── talk.xml.ts        # RSS Feed（仅说说）
│   │   ├── latest.xml.ts      # RSS Feed（最新 10 篇）
│   │   ├── sitemap.xml.ts     # Sitemap
│   │   ├── posts/[id].astro   # 文章详情页
│   │   ├── category/[...]     # 分类页面
│   │   ├── tag/[...]          # 标签页面
│   │   ├── page/[page].astro  # 分页路由
│   │   └── talk/[...]         # 说说页面
│   └── utils/              # 工具函数
│       ├── postsFetcher.ts    # 文章数据处理
│       └── readingTime.ts     # 阅读时间计算
├── astro.config.mjs        # Astro 配置
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚙️ 配置指南 / Configuration Guide

所有可定制内容都已集中到 `src/config/site.ts`，文件内全部字段都有中文注释说明用途。`seo.ts` 与 `info.ts` 现在只是向后兼容的 re-export，便于旧引用过渡。

### 1. 站点基础信息 / Site Config

`src/config/site.ts` 中的 `siteConfig`：

```ts
export const siteConfig = {
  title: "UpXuu",                          // 站点标题
  subtitle: "HI I AM UPXUU / UPXUU AND YOU", // 副标题（用 / 分隔多句，首页打字动画轮流展示）
  description: "UpXuu's personal blog and portfolio",
  author: "UpXuu",
  url: "https://upxuu.com",                // 影响 Canonical / Sitemap / OG / RSS
  avatar: "https://upxuu.com/images/me.jpg",
  signature: "逐光而上！",                  // AuthorCard 签名
  socials: {
    github: "https://github.com/ImUpXuu",
    githubUser: "IMUPXUU",                 // 关于页拉取仓库列表用
    bilibili: "https://space.bilibili.com/...",
    bilibiliMid: "3546855124240550",       // 关于页拉取视频列表用
    bilibiliDisplayName: "UPXUU",
    email: "upxuu@outlook.com",
    qqGroup: "https://qun.qq.com/...",     // 欢迎提示中的 QQ 群链接
    subscribe: "https://github.com/ImUpXuu/xuhome/issues",
    // twitter / youtube / wechat / qq ...
  },
  waline: { serverURL: 'https://com2.upxuu.com' },
  analytics: {
    umami: [                               // 可配多个 Umami 实例
      { src: "https://stats.upxuu.com/script.js", id: "cd983d6c-..." },
      { src: "https://cloud.umami.is/script.js", id: "9f42cc31-..." },
    ],
    statsApi: {
      alltime: 'https://vapi.upxuu.com/statsapi/alltime',
      active: 'https://vapi.upxuu.com/api/active',
    },
  },
  assets: {
    defaultPostCover: "",
    randomImage: "https://bing.img.run/rand.php",
    favicon: "/images/me.jpg",
  },
  startTime: new Date(2025, 8, 30, 20, 20, 0), // 页脚运行计时器起点
  trustedDomains: ['github.com', 'bilibili.com', ...], // 外链免确认白名单
};
```

### 2. 导航栏 / Navigation

`navConfig` 分三组：桌面端主项、移动端汉堡菜单、外链项：

```ts
export const navConfig = {
  desktop: [
    { name: "首页", href: "/" },
    { name: "说说", href: "/talks" },
    { name: "友链", href: "/friends" },
    { name: "关于", href: "/about" },
    { name: "归档", href: "/archive" },
    { name: "统计", href: "/stats" },
  ],
  mobileMore: [
    { name: "友链", href: "/friends" },
    { name: "关于", href: "/about" },
    { name: "归档页面", href: "/archive" },
    { name: "网站统计", href: "/stats" },
  ],
  external: [
    { name: "开往", href: "https://www.travellings.cn/go.html", external: true },
    { name: "服务状态", href: "https://up.upxuu.com/status/1", external: true },
  ],
};
```

### 3. 页脚 / Footer

`footerConfig` 包含版权文字、ICP 备案、底部链接、开源仓库信息：

```ts
export const footerConfig = {
  copyrightText: "© 2026 UpXuu. All Rights Reserved. ",
  icp: { text: "萌 ICP 备 20269996 号", link: "https://icp.gov.moe/?keyword=20269996" },
  links: [
    { name: "友情链接", path: "/friends", external: false },
    { name: "RSS", path: "/rss.xml", external: true },
    { name: "Sitemap", path: "/sitemap.xml", external: true },
    { name: "隐私政策", path: "/privacy", external: false },
  ],
  repoText: "本站已开源 ",
  repoUrl: "https://github.com/ImUpXuu/xuhome",
  repoDisplayName: "IMUPXUU/XUHOME",
};
```

### 4. SEO 配置 / SEO

`seoConfig` 已移入 `site.ts`，`src/config/seo.ts` 现为 re-export：

```ts
export const seoConfig = {
  defaultTitle: "UpXuu's blog",
  titleTemplate: " - UpXuu",
  defaultDescription: "UpXuu的个人博客 - 记录生活、学习、编程与思考。",
  defaultImage: "https://upxuu.com/images/me.jpg",
  keywords: ["UpXuu", "blog", "开发者", ...],
  twitter: { card: "summary_large_image", site: "@ImUpXuu", creator: "@ImUpXuu" },
  dnsPrefetch: [...],
  preconnect: [...],
  robots: "index, follow, max-image-preview:large, ...",
};
```

### 5. AI 功能 / AI Features

`contentConfig` 集中管理 AI 摘要 / 对话模型列表（`url` 为完整请求地址，按顺序 fallback）：

```ts
export const contentConfig = {
  postsPerPage: 10,
  readingSpeed: 400,                       // 字/分钟，计算预计阅读时间
  license: { name: "All Rights Reserved", url: "/about" },
  aiSummaryModels: [
    { id: 'gpt-oss', name: 'GPT-OSS-120B', url: 'https://blogapi.upxuu.com/summarize', hasThinking: false },
    { id: 'gemma', name: 'Gemma-4-31b-it (OpenRouter)', url: 'https://blogapi.upxuu.com/summarize2', hasThinking: true },
    { id: 'deepseek-r1', name: 'DeepSeek-R1', url: 'https://blogapi.upxuu.com/summarize3', hasThinking: true },
  ],
  aiChatModels: [
    { id: 'gpt-oss', name: 'GPT-OSS-120B', url: 'https://blogapi.upxuu.com/chat', hasThinking: false },
    // ...
  ],
};
```

AI 后端服务需自行部署（默认指向 `https://blogapi.upxuu.com`）。

### 6. 欢迎提示 / Welcome Toast

`welcomeConfig` 控制首次访问的欢迎横幅：

```ts
export const welcomeConfig = {
  enabled: true,
  duration: 5000,
  weatherApi: "https://uapis.cn/api/v1/misc/weather",
  fallbackMessage: "Hi！远方的朋友",
  sessionKey: "xuhome_visit_flag",
  quickLinks: [
    { name: "QQ群", href: siteConfig.socials.qqGroup, color: "blue" },
    { name: "订阅", href: siteConfig.socials.subscribe, color: "green" },
    { name: "RSS", href: "", action: "copyRss", color: "orange" },
  ],
};
```

### 7. 关于页 / About Page

`aboutConfig` 单独管理关于页的所有内容（角色、简介、技能、Bilibili/GitHub 区块文字等）。注意：关于页 Socials 区块的邮箱链接使用 `socialEmailLink: "mailto:me@upxuu.com"`，与 `siteConfig.socials.email` (`upxuu@outlook.com`) 不同，原博客即如此。

### 8. 全站文案 / i18n

`i18nConfig` 收纳所有页面固定文案，方便统一修改和未来国际化：

```ts
export const i18nConfig = {
  notFound: { title, bigText, message, backHome, browseArchive },
  archive: { title, description, timelineTitle, emptyText, emptySubtext, sectionTitle },
  home: { title, description, sectionTitle },
  talks: { title, sectionTitle },
  talk: { detailFallbackTitle },
  category: { titleSuffix, descriptionTemplate },
  tag: { titleSuffix, descriptionTemplate },
  friends: { title, description },
  privacy: { title, description, lastUpdated, effectiveDate, contactEmail },
  stats: { title },
  post: { readingTime, readingTimeUnit, copyrightTitle, publishedTitle, licenseTitle,
          relatedPosts, prevPost, nextPost, noMorePrev, noMoreNext, tocTitle, tocEmpty, viewToc },
  search: { placeholder, clear, noResults, jumpTo, go },
  common: { darkMode, lightMode, more, openMenu, closeMenu, toggleDarkMode },
};
```

### 9. 横幅与副标题 / Banner & Subtitle

`bannerConfig` 控制 PageBanner 主标题、网格透明度、各页面类型标签、说说页打字动画；`subtitleConfig` 控制首页 Banner 左侧的副标题打字动画序列。

### 10. 友链 / Friends

编辑 `src/config/friends.json`，格式：

```json
[
  {
    "name": "友人名称",
    "url": "https://example.com",
    "avatar": "https://example.com/avatar.jpg",
    "description": "个人简介"
  }
]
```

### 11. 评论系统 / Comments

项目使用 Waline 自托管评论系统。需要：

1. 部署 Waline 服务端（参考 [Waline 文档](https://waline.js.org)）
2. 在 `siteConfig.waline.serverURL` 中设置服务地址

### 12. 深浅色主题 / Dark Mode

主题状态保存在 `localStorage.theme`，在 `Layout.astro` 的 `<head>` 内联脚本中优先于首屏渲染读取，避免闪白。`NavBar.astro` 中的切换按钮通过 `data-theme-toggle` 触发，事件监听器只全局绑定一次，并在每次 `astro:page-load` 时同步 icon / label 状态，切页后不会回退到浅色。主题不跟随系统，默认浅色。

如需修改主题相关文案，在 `i18nConfig.common` 中调整 `darkMode`、`lightMode`、`toggleDarkMode`。

---

## 📝 内容管理 / Content Management

### 写文章 / Writing Posts

在 `src/content/posts/` 下创建 `.md` 文件，frontmatter 格式：

```markdown
---
title: "文章标题"
published: 2026-06-06 12:00:00
image: "https://example.com/cover.jpg"
description: "文章描述，用于 SEO 和卡片展示"
tags: ["Vercel", "Docker"]
category: "技术"
---

文章正文，支持 Markdown、GFM、KaTeX 公式、代码高亮。
```

### 写说说 / Writing Talks

在 `src/content/talks/` 下创建 `.md` 文件：

```markdown
---
title: "日常动态"
published: 2026-06-06 10:00:00
location: "石家庄"
weather: "晴"
mood: "开心"
device: "iPhone"
tags: ["日常"]
---

内容正文...
```

---

## 📡 RSS 订阅

项目提供 4 条 RSS 2.0 Feed，均含完整文章/说说内容、`dc:creator`、`lastBuildDate`：

| Feed | 路径 | 内容 |
|------|------|------|
| 全量 | `/rss.xml` | 全部文章 + 说说（说说标题前加 `「说说」` 前缀） |
| 文章 | `/posts.xml` | 仅文章 |
| 说说 | `/talk.xml` | 仅说说 |
| 最新 | `/latest.xml` | 最近 10 篇（文章 + 说说混合，说说带 `「说说」` 前缀） |

页脚有 RSS 快捷链接，欢迎提示中也可一键复制 RSS 地址。

---

## 🌐 部署 / Deployment

### 部署到 Vercel（推荐）

项目内置 `@astrojs/vercel` adapter，一键部署：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 生产部署
vercel --prod
```

或在 Vercel Dashboard 中导入 GitHub 仓库，自动部署。

**Vercel 环境变量：**

| 变量 | 说明 |
|------|------|
| `GEMINI_API_KEY` | Gemini API Key（可选，用于 AI 功能） |
| `APP_URL` | 站点 URL |

### 部署到其他平台 / Other Platforms

项目为 `output: 'static'`，可部署到任何静态托管平台：

```bash
pnpm build
# 将 dist/ 目录部署到你的服务器
```

支持 adapter 切换（Node / Netlify / Cloudflare Pages 等），修改 `astro.config.mjs` 即可。

---

## 🧩 设计主题 / Design Theme

本博客使用 **Toy Brick Brutalism**（积木粗野主义）设计语言：

- **主色** `#0284c7`（天空蓝）— 边框、标题、强调
- **辅色** `#0ea5e9`（亮蓝）— 链接、悬停
- **强调色** `#fde68a`（黄色）— 标签、装饰块
- **背景** `#faf8f5`（米白）— 页面底色

所有组件使用 `border-4`、`shadow-[xpx_xpx_0px_0px_#color]` 的堆叠阴影效果，营造手绘积木的立体感。

---

## 📄 许可协议 / License

> ⚠️ **重要 / Important**
>
> 本项目的定位比较特殊：它是一个**真实的个人博客**，同时也计划后期整理成**开源博客模板**。
> This project has a dual identity: it's a **real personal blog** AND a future **open-source blog template**.

### 开源代码 / Open-Source Code (MIT)

**博客本体代码**（不包括 `src/content/` 下的内容）采用 **MIT 许可证**。包括：

- `src/components/` — 所有 UI 组件
- `src/layouts/` — 布局文件
- `src/pages/` — 页面路由（不含内容）
- `src/config/` — 配置文件
- `src/utils/` — 工具函数
- `src/index.css` — 样式文件
- `src/content.config.ts` — 内容集合配置
- `astro.config.mjs`, `tsconfig.json`, `package.json` 等工程配置

**你可以自由地：**
- ✅ 复制、修改、分发本博客的代码
- ✅ 用于个人或商业项目
- ✅ 作为模板搭建自己的博客

**需保留：**
- 版权声明和许可证文本
- 贡献者署名（如使用了衍生代码）

### 保留权利 / All Rights Reserved (Content)

`src/content/` 目录下的所有内容（包括但不限于）**保留所有权利**：

- `src/content/posts/` — 所有博客文章
- `src/content/talks/` — 所有说说
- 文章和说说中的图片、文字、数据

**未经授权，不得：**
- ❌ 转载、复制、修改文章内容
- ❌ 将文章用于商业用途
- ❌ 去除原始出处信息

### 合法性说明 / Legality

代码 MIT + 内容 ARR 的**双许可模式是合法的**，也是开源社区常见的做法：

- 开源许可证（MIT）只覆盖你主动选择的代码文件，不自动延伸到仓库中的其他内容
- GitHub 上大量项目采用此模式（如个人博客、文档项目等）
- 法律依据：著作权法保护的是"具有独创性的表达"，代码和文章是独立的著作权客体，可以采用不同许可

---

## 🙏 致谢 / Acknowledgements

- [Astro](https://astro.build) — 静态站点框架
- [Tailwind CSS](https://tailwindcss.com) — 原子化 CSS
- [React](https://react.dev) & [Svelte](https://svelte.dev) — UI 框架
- [Waline](https://waline.js.org) — 评论系统
- [Fancybox](https://fancyapps.com) — 图片灯箱
- [KaTeX](https://katex.org) — 数学公式渲染
- [Umami](https://umami.is) — 网站统计
- [Lucide](https://lucide.dev) — 图标库
- [Motion](https://motion.dev) — 动画库
- 所有访问本站的朋友 ❤️
