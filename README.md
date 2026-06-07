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
| **RSS 订阅**    | 全量 RSS 2.0 Feed，含完整文章内容 |
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
│   │   ├── rss.xml.ts         # RSS Feed
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

### 1. 站点基本信息 / Site Info

编辑 `src/config/site.ts`:

```ts
export const siteConfig = {
  title: "UpXuu",           // 站点标题
  subtitle: "HI I AM UPXUU / UPXUU AND YOU",  // 副标题
  description: "UpXuu's personal blog and portfolio",
  author: "UpXuu",          // 作者名
  url: "https://upxuu.com", // 站点 URL（影响 Canonical、Sitemap、OG）
  avatar: "https://upxuu.com/images/avatar.jpg",
  socials: {
    github: "https://github.com/ImUpXuu",
    website: "https://upxuu.com"
  },
  waline: {
    serverURL: 'https://comment.upxuu.com'  // Waline 服务地址
  }
};
```

### 2. SEO 配置 / SEO

编辑 `src/config/seo.ts`:

```ts
export const seoConfig = {
  defaultTitle: "UpXuu's blog",
  titleTemplate: " - UpXuu",           // 标题后缀
  defaultDescription: "...",
  defaultImage: "https://.../og.jpg",  // 默认 OG 图片
  keywords: ["UpXuu", "blog", ...],
  twitter: {
    site: "@ImUpXuu",
    creator: "@ImUpXuu"
  }
};
```

### 3. 页脚信息 / Footer

编辑 `src/config/info.ts` 中的 `footer` 字段：

```ts
footer: {
  copyrightText: "© 2026 UpXuu. All Rights Reserved.",
  icp: {
    text: "萌 ICP 备 20269996 号",
    link: "https://icp.gov.moe/..."
  },
  links: [
    { name: "友情链接", path: "/friends", external: false },
    { name: "RSS", path: "/rss.xml", external: true }
  ]
}
```

### 4. 友链 / Friends

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

### 5. AI 功能 / AI Features

**需要环境变量 / Required env:**

```env
# Gemini API Key (用于 AI 摘要和 AI 对话)
GEMINI_API_KEY="your_gemini_api_key"

# 站点 URL
APP_URL="https://upxuu.com"
```

AI 摘要和对话的后端服务需自行部署（项目默认指向 `https://blogapi.upxuu.com`），可在 `AiSummary.tsx` 和 `AiChat.tsx` 中修改 `API_BASE`。

### 6. 评论系统 / Comments

项目使用 Waline 自托管评论系统。需要：

1. 部署 Waline 服务端（参考 [Waline 文档](https://waline.js.org)）
2. 在 `src/config/site.ts` 中设置 `waline.serverURL`

### 7. 分析统计 / Analytics

项目使用 Umami，在 `src/config/site.ts` 中配置：

```ts
umami: {
  src: "https://stats.upxuu.com/script.js",
  id: "your-website-id"
}
```

也可在 `Layout.astro` 中直接修改 Umami 脚本地址。

### 8. 导航栏 / Navigation

编辑 `src/config/site.ts` 中的 `navConfig`:

```ts
export const navConfig = [
  { name: "博客", path: "/", icon: "BookOpen" },
  { name: "说说", path: "/talk", icon: "MessageSquare" },
  { name: "关于我", path: "/about", icon: "User" }
];
```

图标使用 Lucide React 图标名。

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
