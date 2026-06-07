# UpXuu's Personal Blog

> A brutalism-style personal blog built with Astro. Toy Brick Brutalism — bold blue borders, hand-drawn textures, brick-stacking aesthetics.

[![Astro](https://img.shields.io/badge/Astro-6.x-BC52EE?logo=astro)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte)](https://svelte.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)](https://vercel.com)

**Live Site:** [https://upxuu.com](https://upxuu.com)

---

## Features

### 🎨 Design & UX

| Feature | Description |
|---------|-------------|
| **Brutalism Design** | Hand-drawn aesthetics, bold blue borders, shadow stacking, brick motif |
| **Custom Cursor** | Svelte-powered hand-drawn cursor with click sparkle effect |
| **Type Animation** | Character-by-character typing animation on banners and talk page |
| **Page Transitions** | Astro View Transitions for smooth SPA-like navigation |
| **Skeleton Loading** | Brick-drop styled loading skeleton |
| **Responsive Layout** | Fully adaptive to mobile / tablet / desktop |
| **Table of Contents** | Desktop sidebar + mobile bottom drawer with scroll-active highlighting |
| **Reading Progress** | Gradient progress bar at article page top |
| **Back to Top** | Floating button that appears after 300px scroll |
| **Code Block Enhancement** | Mac-style window controls, copy button, folding for long code blocks |

### 🧠 AI Integration

| Feature | Description |
|---------|-------------|
| **AI Summary** | Auto-generate article summaries with model switching (GPT-OSS / DeepSeek R1 / Qwen 3.5) |
| **AI Chat** | Floating chat widget on article pages for Q&A about content, multi-turn conversation |

### 🗣️ Social

| Feature | Description |
|---------|-------------|
| **Waline Comments** | Self-hosted comment system with Markdown, emoji, captcha, email notification |
| **Sharing** | Poster generation (landscape share image), share to QQ Zone / X (Twitter) / WeChat, copy link, native share API |
| **RSS Feed** | Full-content RSS 2.0 feed with article body |
| **Email Subscription** | GitHub Issues-based update notification system |

### 🔍 Content Management

| Feature | Description |
|---------|-------------|
| **Category Filtering** | Browse posts by category |
| **Tag Filtering** | Browse posts by tag |
| **Full-text Search** | Client-side real-time search across title, description, content, tags |
| **Pagination** | Page numbers, jump-to-page, prev/next navigation |
| **Calendar Archive** | Browse posts by year/month/day |
| **Timeline Archive** | Timeline-style archive page |
| **Talks (Microblog)** | Standalone microblogging with photos, location, weather, mood, device metadata |

### 🤝 Friends

| Feature | Description |
|---------|-------------|
| **Friend Links Grid** | Grid display with site screenshot previews |
| **Auto Application** | GitHub Issues + Actions based automated friend link application |
| **Search Filter** | Real-time friend link search |

### 🔧 Technical

| Feature | Description |
|---------|-------------|
| **SSG Static Generation** | Fully static HTML, CDN-ready, instant load |
| **SEO Optimized** | Open Graph / Twitter Card / JSON-LD structured data / Sitemap / robots.txt / Canonical URL |
| **Image Lightbox** | Fancybox with zoom and fullscreen |
| **Math Rendering** | KaTeX for inline and block math |
| **Markdown Enhanced** | GFM tables, task lists, strikethrough |
| **Umami Analytics** | Privacy-friendly self-hosted analytics |
| **Custom 404** | Brutalism-style 404 page |
| **Open Source** | Full source code available on GitHub |

---

## Quick Start

### Prerequisites

- **Node.js** >= 22
- **pnpm** (recommended) or npm / yarn

### Installation

```bash
git clone https://github.com/ImUpXuu/xuhome.git
cd xuhome
pnpm install
```

### Development

```bash
pnpm dev
```

Visit `http://localhost:3000` with hot reload.

### Build

```bash
pnpm build
```

Output in `dist/`.

### Preview

```bash
pnpm preview
```

---

## Project Structure

```
xuhome/
├── public/                     # Static assets
│   ├── images/
│   └── robots.txt
├── src/
│   ├── components/             # UI components (React / Svelte / Astro)
│   │   ├── AiChat.tsx              # AI chat
│   │   ├── AiSummary.tsx           # AI summary
│   │   ├── CalendarWidget.svelte   # Calendar widget
│   │   ├── CustomCursor.svelte     # Custom cursor
│   │   ├── HorizontalCategories.astro
│   │   ├── NavBar.astro            # Navigation bar
│   │   ├── PageBanner.tsx          # Page banner
│   │   ├── PostsTimelineWidget.astro
│   │   ├── SearchablePosts.svelte  # Searchable post list
│   │   ├── ShareButton.svelte      # Share button
│   │   ├── SidebarTags.astro       # Tag cloud
│   │   ├── SvelteFriends.svelte    # Friend links
│   │   ├── SvelteLightbox.svelte   # Image lightbox
│   │   ├── SvelteTalkDetail.svelte # Talk detail
│   │   ├── TagFilterWidget.tsx     # Tag filter
│   │   ├── TalksFeed.svelte        # Talks feed
│   │   ├── TalkTicker.tsx          # Talk ticker animation
│   │   └── WalineComment.tsx       # Comment system
│   ├── config/                 # Configuration files
│   │   ├── site.ts                 # Site config
│   │   ├── seo.ts                  # SEO config
│   │   ├── info.ts                 # Site info config
│   │   └── friends.ts              # Friends config
│   ├── content/                # Content collections
│   │   ├── posts/                  # Blog posts (Markdown)
│   │   └── talks/                  # Talks (Markdown)
│   ├── content.config.ts
│   ├── index.css               # Global styles (Tailwind v4)
│   ├── layouts/
│   │   └── Layout.astro            # Global layout
│   ├── pages/                  # Page routes
│   │   ├── index.astro             # Home
│   │   ├── 404.astro               # Custom 404
│   │   ├── about.astro             # About page
│   │   ├── archive.astro           # Archive
│   │   ├── friends.astro           # Friends
│   │   ├── rss.xml.ts              # RSS feed
│   │   ├── sitemap.xml.ts          # Sitemap
│   │   ├── posts/[id].astro        # Post detail
│   │   ├── category/[...]          # Category pages
│   │   ├── tag/[...]               # Tag pages
│   │   ├── page/[page].astro       # Pagination
│   │   └── talk/[...]              # Talk pages
│   └── utils/
│       ├── postsFetcher.ts
│       └── readingTime.ts
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

---

## Configuration

### 1. Site Info

Edit `src/config/site.ts`:

```ts
export const siteConfig = {
  title: "UpXuu",
  subtitle: "HI I AM UPXUU / UPXUU AND YOU",
  description: "UpXuu's personal blog and portfolio",
  author: "UpXuu",
  url: "https://upxuu.com",  // Affects Canonical, Sitemap, OG
  avatar: "https://upxuu.com/images/avatar.jpg",
  socials: {
    github: "https://github.com/ImUpXuu",
    website: "https://upxuu.com"
  },
  waline: {
    serverURL: 'https://comment.upxuu.com'  // Waline server
  }
};
```

### 2. SEO

Edit `src/config/seo.ts`:

```ts
export const seoConfig = {
  defaultTitle: "UpXuu's blog",
  titleTemplate: " - UpXuu",
  defaultDescription: "...",
  defaultImage: "https://.../og.jpg",
  keywords: ["UpXuu", "blog", ...],
  twitter: {
    site: "@ImUpXuu",
    creator: "@ImUpXuu"
  }
};
```

### 3. Footer

Edit `src/config/info.ts`:

```ts
footer: {
  copyrightText: "© 2026 UpXuu. All Rights Reserved.",
  icp: { text: "ICP No.", link: "https://..." },
  links: [
    { name: "Friends", path: "/friends", external: false },
    { name: "RSS", path: "/rss.xml", external: true }
  ]
}
```

### 4. Friends

Edit `src/config/friends.json`:

```json
[
  {
    "name": "Friend Name",
    "url": "https://example.com",
    "avatar": "https://example.com/avatar.jpg",
    "description": "Bio"
  }
]
```

### 5. AI Features

**Required environment variables:**

```env
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="https://upxuu.com"
```

The AI backend service defaults to `https://blogapi.upxuu.com`. Modify `API_BASE` in `AiSummary.tsx` and `AiChat.tsx` to use your own.

### 6. Comments

Deploy a Waline server (see [Waline docs](https://waline.js.org)) and set `waline.serverURL` in `src/config/site.ts`.

### 7. Navigation

Edit `src/config/site.ts`:

```ts
export const navConfig = [
  { name: "Blog", path: "/", icon: "BookOpen" },
  { name: "Talks", path: "/talk", icon: "MessageSquare" },
  { name: "About", path: "/about", icon: "User" }
];
```

Icons are Lucide React icon names.

---

## Content Management

### Writing Posts

Create `.md` files in `src/content/posts/`:

```markdown
---
title: "Post Title"
published: 2026-06-06 12:00:00
image: "https://example.com/cover.jpg"
description: "SEO description"
tags: ["Vercel", "Docker"]
category: "Tech"
---

Article content with Markdown, GFM, KaTeX math, code highlighting.
```

### Writing Talks

Create `.md` files in `src/content/talks/`:

```markdown
---
title: "Daily Update"
published: 2026-06-06 10:00:00
location: "Shijiazhuang"
weather: "Sunny"
mood: "Happy"
device: "iPhone"
tags: ["daily"]
---

Content here...
```

---

## Deployment

### Deploy to Vercel (Recommended)

The project includes `@astrojs/vercel` adapter for one-click deployment:

```bash
npm i -g vercel
vercel
vercel --prod
```

Or import the GitHub repo in Vercel Dashboard.

**Environment Variables:**

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Gemini API Key (optional, for AI) |
| `APP_URL` | Site URL |

### Deploy to Other Platforms

```bash
pnpm build
# Deploy the dist/ directory to any static hosting
```

Switch adapters in `astro.config.mjs` for Node / Netlify / Cloudflare Pages, etc.

---

## Design Theme

**Toy Brick Brutalism** design language:

- **Primary** `#0284c7` (sky blue) — borders, headings, accents
- **Secondary** `#0ea5e9` (light blue) — links, hovers
- **Accent** `#fde68a` (yellow) — tags, decorators
- **Background** `#faf8f5` (off-white) — page base

All components use `border-4` and stacked `shadow-[xpx_xpx_0px_0px_#color]` effects for a hand-drawn brick aesthetic.

---

## License

> ⚠️ **Important**
>
> This project has a dual identity: it's a **real personal blog** AND a future **open-source blog template**.

### Open-Source Code (MIT)

**Blog source code** (excluding `src/content/`) is licensed under the **MIT License**. This includes:

- `src/components/` — UI components
- `src/layouts/` — Layout files
- `src/pages/` — Page routes (excluding content)
- `src/config/` — Configuration files
- `src/utils/` — Utility functions
- `src/index.css` — Styles
- `src/content.config.ts` — Content collection config
- `astro.config.mjs`, `tsconfig.json`, `package.json`, etc.

**You are free to:**
- ✅ Copy, modify, and distribute the blog source code
- ✅ Use it for personal or commercial projects
- ✅ Use it as a template for your own blog

**Requirements:**
- Retain copyright notice and license text
- Attribute contributors if using derivative code

### All Rights Reserved (Content)

All content under `src/content/` (including but not limited to) **retains all rights**:

- `src/content/posts/` — Blog articles
- `src/content/talks/` — Micro-posts
- Images, text, and data within articles and talks

**Without permission, you may NOT:**
- ❌ Reproduce, copy, or modify article content
- ❌ Use articles for commercial purposes
- ❌ Remove original attribution

### Legality

The **dual license model (MIT code + ARR content) is legally valid** and common in open source:

- Open-source licenses only cover the specific files you choose to license — they don't automatically extend to other content in the repo
- Many GitHub projects use this model (personal blogs, documentation sites, etc.)
- Legal basis: copyright law treats code and creative content as independent works — they can have different licenses

---

## Acknowledgements

- [Astro](https://astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [React](https://react.dev) & [Svelte](https://svelte.dev)
- [Waline](https://waline.js.org)
- [Fancybox](https://fancyapps.com)
- [KaTeX](https://katex.org)
- [Umami](https://umami.is)
- [Lucide](https://lucide.dev)
- [Motion](https://motion.dev)
- All visitors and friends ❤️
