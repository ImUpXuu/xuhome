# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UpXuu's personal blog — an Astro 6.x SSG (Static Site Generation) site deployed to Vercel. Features a "Toy Brick Brutalism" design language: bold blue borders (`#0284c7`), hand-drawn textures, stacked shadows. Content is in Chinese with bilingual SEO metadata.

## Commands

```bash
pnpm dev          # Start dev server on http://localhost:3000 (hot reload)
pnpm build        # Static build to dist/
pnpm preview      # Preview the built site
pnpm lint         # TypeScript type-check (tsc --noEmit)
```

## Architecture

### Multi-Framework Setup

Astro is the shell (layouts, routing, SSG). Interactive islands use:
- **React 19** — Complex interactive components (AI chat, AI summary, page banner, Waline comments, tag filter)
- **Svelte 5** — Lighter interactions (custom cursor, calendar widget, lightbox, talks feed, share button, stats)

See `astro.config.mjs` for integration registration and Vite config.

### Content System

Uses Astro Content Collections v2 with glob loaders (`src/content.config.ts`):
- `src/content/posts/` — Blog posts (Markdown, published via frontmatter date)
- `src/content/talks/` — Microblog/talks (Markdown, with location/weather/mood/device metadata)

Schemas use `z.any()` — no strict frontmatter validation at build time.

Helper utilities in `src/utils/`:
- `postsFetcher.ts` — Pagination, filtering by category/tag, sorting, search
- `posts.ts` — Post data access layer
- `talks.ts` — Talks data access
- `readingTime.ts` — Reading time calculation for posts

### Routing

File-based routing via `src/pages/`:
- `index.astro` + `page/[page].astro` — Paginated post list
- `posts/[id].astro` — Single post (detail page with AI chat, AI summary, Waline comments, TOC)
- `category/[categoryName].astro` + `category/[categoryName]/page/[page].astro` — Posts by category
- `tag/[tagName].astro` + `tag/[tagName]/page/[page].astro` — Posts by tag
- `talk/index.astro` → redirects to `/talks` (config-level 301); `talks/index.astro` — Talks list; `talk/[id].astro` — Single talk
- `archive.astro`, `friends.astro`, `about.astro`, `stats.astro`, `links.astro`, `404.astro`
- `rss.xml.ts`, `sitemap.xml.ts` — RSS 2.0 and sitemap generation

### Configuration (`src/config/`)

| File | Purpose |
|------|---------|
| `site.ts` | Site metadata, navigation items, Waline/Umami config, theme colors |
| `seo.ts` | OG/Twitter/schema defaults |
| `info.ts` | Footer links, ICP record, copyright |
| `friends.ts` | Friend link definitions (code-based) |
| `friends.json` | Friend link data (data-based) |

### AI Integration

AI chat and summary components (`AiChat.tsx`, `AiSummary.tsx`) call external API at `https://blogapi.upxuu.com/*`. Supports multiple models (GPT-OSS, DeepSeek R1, Gemma). Chat history persists in `localStorage`. Requires `GEMINI_API_KEY` env var.

### Design System

Toy Brick Brutalism in `src/index.css` (Tailwind v4 + custom CSS):
- Primary blue `#0284c7`, secondary `#0ea5e9`, accent `#f59e0b`, background `#faf8f5`
- Stacked border shadows: `border-4 border-sky-500 shadow-[4px_4px_0px_0px_#0284c7]`
- Tailwind v4 config via `@tailwindcss/vite` plugin (CSS-based config, no `tailwind.config.js`)

### Layout System

`src/layouts/Layout.astro` — base layout injecting SEO meta, nav bar, footer, custom cursor, view transitions. All pages use this layout.

### Vercel Deployment

- Output: `static` with `@astrojs/vercel` adapter
- `vercel.json` adds `X-Robots-Tag: noindex` on `*.vercel.app` preview deployments to prevent duplicate indexing
- Preview URL: `*.vercel.app` has `noindex, nofollow, nosnippet` headers

### Key Patterns

- **Path alias**: `@/*` → project root (configured in `tsconfig.json` paths)
- **No SSR**: All pages are statically generated at build time
- **Client islands**: React/Svelte components use `client:load` or `client:visible` directives
- **Content loading**: Uses `Astro.props` + `getStaticPaths()` for dynamic routes
- **LocalStorage keys**: AI features use `xuai-*` prefix for localStorage
